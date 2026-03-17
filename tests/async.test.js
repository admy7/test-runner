const assert = require("assert");

function fetchData() {
  return new Promise((resolve) => {
    setTimeout(() => resolve({ status: 200, data: "ok" }), 1000);
  });
}

async function main() {
  const result = await fetchData();
  assert.strictEqual(result.status, 200);
  assert.strictEqual(result.data, "ok");
  console.log("All async tests passed");
}

main();
