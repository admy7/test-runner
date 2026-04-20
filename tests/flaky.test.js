import fs from "node:fs";
import path from "node:path";
import os from "node:os";

// Use a temp file to track attempts across runs.
// First run fails, second run passes.
const stateFile = path.join(os.tmpdir(), "flaky-test-state.txt");

let attempts = 0;
try {
  attempts = parseInt(fs.readFileSync(stateFile, "utf-8"), 10) || 0;
} catch {
  // File doesn't exist yet
}

attempts++;
fs.writeFileSync(stateFile, String(attempts));

if (attempts % 2 === 1) {
  console.error("Flaky failure — transient error");
  process.exit(1);
} else {
  // Reset for next test run
  fs.unlinkSync(stateFile);
  console.log("Flaky test passed on retry");
}
