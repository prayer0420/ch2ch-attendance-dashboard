const assert = require('node:assert/strict');

(async () => {
  const { getWebClearTargetFamilies } = await import(
    '../runner/legacy-ch2ch/src/web-clear-targets.js'
  );

  const rows = [
    { family: '민석이네', name: '체크 안 된 사람', sunday: false, department: false },
    { family: '민석이네', name: '체크된 사람', sunday: true, department: true },
    { family: '새가족반\n결석중', name: '새가족 A', sunday: false, department: false },
    { family: '새가족팀\n공부중', name: '새가족 B', sunday: true, department: false },
    { family: '건우이네', name: '건우', sunday: false, department: false },
    { family: '청년부', name: '제외 대상', sunday: true, department: true },
    { family: '민석이네', name: '중복 가족', sunday: false, department: false }
  ];

  assert.deepEqual(getWebClearTargetFamilies(rows), ['민석이네', '새가족반', '건우이네']);
  assert.deepEqual(
    getWebClearTargetFamilies(['새가족팀', '재용이네', '재용이네', '새가족반']),
    ['새가족반', '재용이네']
  );

  console.log('web clear target family checks passed');
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
