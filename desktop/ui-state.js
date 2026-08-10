function labelForState(state) {
  return {
    starting: "준비 중",
    running: "실행 중",
    error: "오류",
    stopped: "종료됨"
  }[state] || "확인 중";
}

module.exports = { labelForState };
