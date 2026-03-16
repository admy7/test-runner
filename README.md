# Backend Engineer — Technical Test

## Context

At Heal.dev, were are building an AI QA Agent. Our agent writes and maintains js playwright tests. To do so, we are developing our in-home javascript test runner.
The person that will join us will primary work on our custom test runner and its integration with our SaaS, github development workflow and the linked infrastructure.

## Test context

This test has **two parts**:

| Part | What | Time |
|------|------|------|
| **Part 1 — Coding** | Build a simple test runner CLI | ~80% (~1h30) |
| **Part 2 — System design** | Answer design questions about SaaS integration | ~20% (~30min) |

The objective is **not** just to produce working code — it serves as the basis for a **peer review session**. During this review, we will walk through your solution together to assess:
- **Technical skills & experience**: your understanding of the code you wrote, the trade-offs you made, and your ability to reason about correctness, error handling, and concurrency.
- **System design thinking**: how you structured your solution, separated concerns, and thought about extensibility and maintainability.

⚠️⚠️⚠️ You are free to use any tools you want, including LLM-based coding tools. At Heal, we all use them daily. However, you must be able to explain every line of code you submit.

## Duration

- **At home**: 2 hours to complete Parts 1 & 2. The test is intentionally ambitious without LLM-based coding tools — steps 1-4 done well matter more than rushing through all 7.
- **Peer review**: 1 hour with the team, where we walk through your code and discuss the system design questions together.

---

# Part 1 — Coding (~1h30)

Build a **simple test runner**: a CLI tool that discovers test files, executes them as subprocesses, and reports results. This is similar to what tools like Jest, pytest, or `go test` do under the hood.

## Requirements

You can use **JavaScript/TypeScript, Python, Go, Java or Rust**. No external test frameworks — the point is to build the runner yourself.

### Input

Your CLI receives:
- A **directory** containing test files (default: `./tests`)
- Optional flags:
  - `--concurrency <n>` — max parallel tests (default: `1`, i.e. sequential)
  - `--timeout <ms>` — per-test timeout in milliseconds (default: `30000`)
  - `--reporter <type>` — output format: `text` (default) or `json`
  - `--verbose` — enable detailed logging during execution

Example:
```bash
my-runner ./tests --concurrency 4 --timeout 5000 --reporter json
```

### Test file convention

Test files are JavaScript files with the extension `.test.js`, located in the target directory (non-recursive is fine).

A test **passes** if the process exits with code `0`.
A test **fails** if the process exits with a non-zero code.
A test **times out** if it exceeds the configured timeout.

### Output

After all tests have run, print a summary to stdout:

```
Results:

  ✓ math.test.js (120ms)
  ✓ string.test.js (85ms)
  ✗ network.test.js (5000ms) [TIMEOUT]
      Retried 2 times, last attempt:
      stderr: Connection refused
  ✗ parse.test.js (12ms)
      stderr: AssertionError: expected 3 but got 4

3 passed, 2 failed, 5 total
```

The CLI must exit with code `0` if all tests pass, `1` otherwise.

### JSON report

If `--reporter json` is passed, write a JSON report to `report.json` in the working directory:

```json
{
  "summary": {
    "total": 5,
    "passed": 3,
    "failed": 2,
    "duration": 1234
  },
  "tests": [
    {
      "file": "math.test.js",
      "status": "passed",
      "duration": 120,
      "attempts": 1,
      "logs": [
        { "timestamp": "2026-03-16T10:00:00.000Z", "level": "info", "message": "Test started" },
        { "timestamp": "2026-03-16T10:00:00.120Z", "level": "info", "message": "Test passed" }
      ]
    },
    {
      "file": "network.test.js",
      "status": "failed",
      "duration": 5000,
      "attempts": 3,
      "error": "TIMEOUT",
      "logs": [
        { "timestamp": "2026-03-16T10:00:00.121Z", "level": "info", "message": "Test started" },
        { "timestamp": "2026-03-16T10:00:05.121Z", "level": "error", "message": "Test timed out after 5000ms" }
      ]
    }
  ]
}
```

## Step-by-step guide

We recommend you tackle this in order. Each step builds on the previous one.

### Step 1 — Discovery & sequential execution

- Parse CLI arguments (directory path, flags)
- Find all `*.test.js` files in the given directory
- Execute each file sequentially using `node <file>`
- Capture exit code, stdout, stderr, and duration
- Print the summary and exit with the correct code

### Step 2 — Concurrency

- Run up to `--concurrency` tests in parallel
- The summary is printed only when all tests are done

### Step 3 — JSON report

- When `--reporter json` is passed, write `report.json` to the working directory with the format described above

### Step 4 — Timeout

- Kill any test that exceeds `--timeout` milliseconds
- Mark it as `TIMEOUT` in the output

### Step 5 — Logging

- Add a dedicated logger for the test runner and for each individual test
- Capture and store logs per test so they can be included in the report
- Each test's logs should be isolated and attributable to that specific test

### Step 6 — Verbose mode

- Add a `--verbose` flag to the CLI (default: `false`)
- By default, print test start/end events and the final summary
- When `--verbose` is enabled, additionally print stdout, stderr, and internal runner events during execution

### Step 7 — Playwright config & project dependencies (optional)

Parse a Playwright-style configuration file and run tests respecting project dependencies. Given a config like:

```typescript
// playwright.config.ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  projects: [
    {
      name: 'setup',
      testMatch: /setup\.test\.js/,
    },
    {
      name: 'tests',
      testMatch: /.*\.test\.js/,
      dependencies: ['setup'],
    },
  ],
});
```

- Parse the config to extract projects and their `dependencies`
- Run projects in the correct order (e.g. `setup` must complete before `tests` starts)
- A project only starts once all its dependencies have passed
- If a dependency fails, skip its dependents and mark them as `skipped`

## Sample test files

The `tests/` directory contains sample test files you can use to validate your runner:

| File | Behavior |
|------|----------|
| `math.test.js` | Passes |
| `string.test.js` | Passes |
| `async.test.js` | Passes after 1s |
| `failure.test.js` | Always fails |
| `timeout.test.js` | Hangs for 60s (should be killed) |
| `flaky.test.js` | Fails on first run, passes on retry (uses a temp file as state) |

## What we evaluate

| Criteria | What we look for |
|----------|-----------------|
| **Correctness** | Does the runner handle all cases? (pass, fail, timeout, retry) |
| **Code quality** | Clean structure, separation of concerns, naming |
| **Error handling** | Graceful handling of crashes, missing files, edge cases |
| **Concurrency** | Correct parallel execution, no race conditions |
| **CLI design** | Clear usage, argument validation, helpful error messages |
| **Testability** | Is the code structured so it can be easily tested? |

We do **not** evaluate:
- UI polish or colors
- Performance optimization
- Fancy features beyond the spec

---

# Part 2 — System design (~30min)

During the review, we will discuss how you would integrate this test runner into a SaaS platform. No code is expected — but some features may require code changes to your runner. Just describe what you would change. Be prepared to discuss the following:

- **Triggering**: How would a SaaS trigger a test run on a remote machine or environment?
- **Reporting**: How would the runner push the JSON report back to the SaaS once the run is complete?
- **Live status**: How would the runner stream real-time status updates (test started, passed, failed) to the SaaS as tests execute?

---

## Delivery

Push your solution to a new branch in this repository. Include a brief `SOLUTION.md` explaining:
- How to run your solution
- Any design decisions worth noting
- What you would improve with more time
