const { __test } = require("../runner/src/automation-adapter");

const url = "https://docs.google.com/spreadsheets/d/1DXEeV2h5lk3c8clfNBZPDw3biuqkIP1-5ENvapcVvk8/gviz/tq?tqx=out:csv&sheet=%EA%B0%80%EC%9E%A5%EC%B2%B4%ED%81%AC";

fetch(url)
  .then((response) => {
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.text();
  })
  .then((text) => {
    const people = __test.rowsFromCsv(text);
    console.log(JSON.stringify({
      people: people.length,
      families: new Set(people.map((person) => person.family)).size,
      service13: people.filter((person) => person.service13).length,
      service4: people.filter((person) => person.service4).length
    }));
  })
  .catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
