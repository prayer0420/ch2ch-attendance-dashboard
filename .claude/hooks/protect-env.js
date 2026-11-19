#!/usr/bin/env node
// PreToolUse guard: keep .env / .env.local secrets (access code, tokens, CH2CH
// account) out of Claude's context. .env.example stays readable.
// Value-free checks (e.g. a node script that prints only "set: true") are allowed.
let raw = '';
process.stdin.on('data', (c) => (raw += c));
process.stdin.on('end', () => {
  let input;
  try { input = JSON.parse(raw || '{}'); } catch { process.exit(0); }
  const tool = input.tool_name || '';
  const ti = input.tool_input || {};

  // .env, .env.local, .env.production.local ... but not .env.example
  const secretFile = /(^|[\\/\s"'`=:])\.env(\.(?!example\b)[\w.-]+)?(?![\w.-])/i;
  const isSecretPath = (p) => {
    if (!p || typeof p !== 'string') return false;
    const base = p.split(/[\\/]/).pop();
    return /^\.env(\.[\w.-]+)?$/i.test(base) && !/^\.env\.example$/i.test(base);
  };
  const deny = (why) => {
    process.stdout.write(JSON.stringify({
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'deny',
        permissionDecisionReason: `${why} .env.local holds the access code, tokens and the CH2CH account. Check values without printing them (e.g. a node script that prints only whether a key is set), or ask the user to edit the file themselves.`
      }
    }));
    process.exit(0);
  };

  if (['Read', 'Edit', 'Write', 'NotebookEdit'].includes(tool)) {
    if (isSecretPath(ti.file_path || ti.notebook_path)) deny(`Blocked ${tool} of a secret env file.`);
  } else if (tool === 'Grep') {
    if (isSecretPath(ti.path) || (ti.glob && /\.env(?!\.example)/i.test(ti.glob))) deny('Blocked Grep inside a secret env file.');
  } else if (tool === 'Bash' || tool === 'PowerShell' || tool === 'mcp__terminal__run_in_terminal') {
    const cmd = String(ti.command || '');
    if (!secretFile.test(cmd)) process.exit(0);
    const dumper = /\b(cat|type|gc|Get-Content|head|tail|less|more|bat|grep|egrep|rg|findstr|Select-String|sls|sed|awk|strings|xxd|od|hexdump|Copy-Item|cp|copy|scp|curl|Out-File|Set-Clipboard|clip)\b/i;
    if (dumper.test(cmd)) deny('Blocked a shell command that would print or copy a secret env file.');
  }
  process.exit(0);
});
