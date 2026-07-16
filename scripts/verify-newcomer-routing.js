const assert = require('assert');
const fs = require('fs');
const path = require('path');

async function main() {
  const routing = await import('../runner/legacy-ch2ch/src/family-routing.js');
  const parser = require('../runner/src/automation-adapter').__test;
  const attendanceFile = path.join(__dirname, '..', 'runner', 'legacy-ch2ch', 'data', 'attendance.csv');
  const people = parser.rowsFromCsv(fs.readFileSync(attendanceFile, 'utf8')).map((person, index) => ({
    sourceRow: index + 2,
    family: person.family,
    name: person.name,
    sunday: person.service13,
    department: person.service4,
    note: person.note || ''
  }));

  assert.equal(routing.getRouteFamilyName('새가족반\n공부중'), '새가족반');
  assert.equal(routing.getRouteFamilyName('새가족반\n결석중'), '새가족반');
  assert.equal(routing.getAffiliationOriginalFamily({ result: { familyName: '새가족반' } }), '새가족반');
  assert.equal(routing.getAffiliationOriginalFamily({ rowInfo: { family: '새가족반\n결석중' } }), '새가족반');
  assert.equal(routing.shouldRecheckAttendancePerson({ ok: true, fallbackSearch: true }, 'fast'), false);
  assert.equal(routing.shouldRecheckAttendancePerson({ ok: false }, 'fast'), true);
  assert.equal(routing.shouldRecheckAttendancePerson({ ok: true, saveAttempted: false }, 'fast'), true);

  const groups = routing.groupRowsByRoute(people);
  const newcomerGroups = groups.filter((group) => group.family === '새가족반');
  assert.equal(newcomerGroups.length, 1);
  assert.equal(newcomerGroups[0].rows.length, 18);
  assert.equal(newcomerGroups[0].rows.filter((row) => row.sunday).length, 7);
  assert.equal(newcomerGroups[0].rows.filter((row) => row.department).length, 11);
  console.log('[OK] 새가족반 공부중/결석중 통합: 18명, 주일 7명, 부서 11명');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
