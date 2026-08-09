const dotenv = require("dotenv");

dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

const os = require("node:os");
const { createClient } = require("@supabase/supabase-js");
const { getRunnerConfig } = require("./env");
const { runAttendanceAutomation } = require("./automation-adapter");
const { buildQrWorkerPayload } = require("./qr-sync-job");

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

class Runner {
  constructor(config) {
    this.config = config;
    this.supabase = createClient(config.supabaseUrl, config.serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });
    this.currentRunId = null;
  }

  async start() {
    console.log(`[Runner] 시작: ${this.config.runnerId}`);
    await this.heartbeat("online", "대기 중");

    setInterval(() => {
      this.heartbeat("online", this.currentRunId ? "실행 중" : "대기 중").catch((error) => {
        console.error("[Runner] heartbeat 실패:", error.message);
      });
    }, this.config.heartbeatIntervalMs);

    do {
      const run = await this.pickQueuedRun();
      if (run) {
        await this.processRun(run);
      } else {
        const qrJob = await this.pickQueuedQrJob();
        if (qrJob) await this.processQrJob(qrJob);
        else console.log("[Runner] 대기 중인 실행 요청 없음");
      }

      if (this.config.once) break;
      await sleep(this.config.pollIntervalMs);
    } while (true);
  }

  async heartbeat(status, step) {
    const payload = {
      runner_id: this.config.runnerId,
      hostname: os.hostname(),
      status,
      last_seen_at: new Date().toISOString(),
      current_run_id: this.currentRunId,
      current_step: step
    };

    const { error } = await this.supabase
      .from("runner_heartbeats")
      .upsert(payload, { onConflict: "runner_id" });
    if (error) throw error;
  }

  async pickQueuedRun() {
    const { data: run, error } = await this.supabase
      .from("attendance_runs")
      .select("*")
      .eq("status", "queued")
      .order("requested_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    if (!run) return null;

    console.log(`[Runner] queued 요청 발견: ${run.id}`);

    const { data: picked, error: updateError } = await this.supabase
      .from("attendance_runs")
      .update({
        status: "picked_up",
        runner_id: this.config.runnerId,
        runner_hostname: os.hostname(),
        started_at: new Date().toISOString(),
        current_step: "Runner 접수"
      })
      .eq("id", run.id)
      .eq("status", "queued")
      .select("*")
      .maybeSingle();

    if (updateError) throw updateError;
    return picked;
  }

  async pickQueuedQrJob() {
    const { data: job, error } = await this.supabase
      .from("qr_sync_jobs")
      .select("*")
      .eq("status", "queued")
      .order("requested_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (error) {
      if (/qr_sync_jobs|schema cache|relation .* does not exist/i.test(error.message || "")) return null;
      throw error;
    }
    if (!job) return null;
    const { data: picked, error: updateError } = await this.supabase
      .from("qr_sync_jobs")
      .update({ status: "picked_up", runner_id: this.config.runnerId, runner_hostname: os.hostname(), started_at: new Date().toISOString() })
      .eq("id", job.id)
      .eq("status", "queued")
      .select("*")
      .maybeSingle();
    if (updateError) throw updateError;
    return picked;
  }

  async processQrJob(job) {
    console.log(`[Runner] QR 작업 시작: ${job.id} (${job.action})`);
    const update = (payload) => this.supabase.from("qr_sync_jobs").update(payload).eq("id", job.id);
    try {
      await update({ status: "running" });
      const response = await fetch(`${this.config.dashboardUrl}/api/qr-attendance/worker`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildQrWorkerPayload(job))
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || `QR Worker HTTP ${response.status}`);
      const { error } = await update({ status: "completed", result: payload.data, finished_at: new Date().toISOString(), error_message: null });
      if (error) throw error;
      console.log(`[Runner] QR 작업 완료: ${job.id}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await update({ status: "failed", error_message: message, finished_at: new Date().toISOString() });
      console.error(`[Runner] QR 작업 실패: ${job.id} ${message}`);
    }
  }

  async processRun(run) {
    this.currentRunId = run.id;
    const reporter = this.createReporter(run.id);

    try {
      console.log(`[Runner] 실행 시작: ${run.id}`);
      await this.heartbeat("online", "실행 중");
      await reporter.event("runner_picked_up", "Runner가 실행 요청을 가져감");
      await reporter.updateRun({ status: "running", current_step: "자동화 시작" });

      const results = await runAttendanceAutomation(run, reporter);
      await this.saveResults(run, results);

      const finalFailCount = results.filter((result) => result.attempt_stage === "final_fail").length;
      const saveFailCount = results.filter((result) => result.save_result === "failed").length;
      const unverifiedSaveCount = results.filter((result) => result.save_result === "attempted_unverified").length;
      const status = run.dry_run
        ? "dry_run_completed"
        : finalFailCount || saveFailCount || unverifiedSaveCount
          ? "partial_success"
          : "completed";

      await reporter.updateRun({
        status,
        finished_at: new Date().toISOString(),
        processed_count: results.length,
        primary_success_count: results.filter((result) => result.attempt_stage === "primary" && !result.failure_reason).length,
        primary_fail_count: results.filter((result) => result.attempt_stage !== "primary" || result.failure_reason).length,
        second_pass_success_count: results.filter((result) => result.attempt_stage && result.attempt_stage.startsWith("second_pass") && !result.failure_reason).length,
        final_fail_count: finalFailCount,
        save_success_count: results.filter((result) => result.save_result === "success").length,
        save_fail_count: saveFailCount,
        current_step: unverifiedSaveCount ? "완료 - CH2CH 저장 결과 확인 필요" : "완료"
      });
      await reporter.event(
        "completed",
        unverifiedSaveCount
          ? `출석체크 실행 완료. ${unverifiedSaveCount}명의 저장 버튼 실행 결과는 CH2CH 화면에서 확인이 필요합니다.`
          : "출석체크 실행 완료"
      );
      console.log(`[Runner] 실행 완료: ${run.id}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`[Runner] 실행 실패: ${message}`);
      await reporter.updateRun({
        status: "failed",
        finished_at: new Date().toISOString(),
        error_message: message
      });
      await reporter.event("failed", "Runner 실행 실패", { error: message }, "error");
    } finally {
      this.currentRunId = null;
      await this.heartbeat("online", "대기 중");
    }
  }

  createReporter(runId) {
    return {
      updateRun: async (payload) => {
        const { error } = await this.supabase.from("attendance_runs").update(payload).eq("id", runId);
        if (error) throw error;
      },
      event: async (eventType, message, context = null, level = "info") => {
        const { error } = await this.supabase.from("run_events").insert({
          run_id: runId,
          level,
          event_type: eventType,
          message,
          context
        });
        if (error) throw error;
      }
    };
  }

  async saveResults(run, results) {
    if (!results.length) return;

    const rows = results.map((result) => ({ ...result, run_id: run.id }));
    const { data: inserted, error } = await this.supabase.from("attendance_results").insert(rows).select("*");
    if (error) throw error;

    const verifiedResults = run.dry_run
      ? []
      : inserted.filter((result) => result.status === "primary_success" && result.save_result === "success");

    if (!verifiedResults.length) return;

    const weeklyRows = verifiedResults.map((result) => ({
      member_name: result.name,
      normalized_name: result.normalized_name,
      family: result.original_family,
      found_location: result.found_location,
      target_year: new Date().getFullYear(),
      target_term: run.target_term,
      target_week: result.target_week,
      target_week_text: result.target_week_text,
      service_1_3_present: result.service_1_3_present,
      service_4_present: result.service_4_present,
      source_run_id: run.id,
      source_result_id: result.id,
      status: result.status,
      failure_reason: result.failure_reason
    }));

    const { error: weeklyError } = await this.supabase
      .from("attendance_weekly_records")
      .upsert(weeklyRows, { onConflict: "normalized_name,target_term,target_week" });
    if (weeklyError) throw weeklyError;
  }
}

async function main() {
  const runner = new Runner(getRunnerConfig());
  await runner.start();
}

main().catch((error) => {
  console.error("[Runner] 시작 실패:", error);
  process.exitCode = 1;
});
