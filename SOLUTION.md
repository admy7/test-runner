# Solution

## How to run

**Requirements**

- [Node.js](https://nodejs.org/) v22+
- [pnpm](https://pnpm.io/) v10+ (`npm install -g pnpm`)

**Install dependencies**

```bash
pnpm install
```

**Build**

```bash
pnpm build
```

**Link the CLI globally**

```bash
pnpm link --global
```

**Run**

```bash
my-runner ./tests
my-runner ./tests --concurrency 4 --timeout 5000
my-runner ./tests --concurrency 4 --timeout 5000 --reporter json
my-runner ./tests --concurrency 4 --timeout 5000 --verbose
```

Or without linking, directly from the repo:

```bash
node dist/main.js ./tests --concurrency 4 --timeout 5000
```

During development, `pnpm dev` runs the runner via `tsx` with live reload.

---

## Design decisions

### Process-based parallelism

Each test file is executed as a child process via `node <file>`. Parallelism is real OS-level concurrency. The event loop just coordinates when to start and collect results. This was intentional over `worker_threads`: process isolation means a crashing or `process.exit()`. Calling test cannot destabilise the runner or leak state into other tests.

### Fixed worker pool

Concurrency is implemented as a pool of `N` async workers sharing a `nextIndex` counter. Each worker runs a loop, atomically claims the next file index, runs it, and repeats. This is safe against races because JavaScript is single-threaded — `nextIndex++` is atomic in the event loop. No semaphore or queue abstraction needed.

### Reporter owns all output

`Reporter` is constructed in `main.ts` and injected into `TestRunner`. The runner calls three hooks (`onRunStart`, `onTestStart`, `onTestComplete`) and a final `report()`. Every `console.log` in the codebase lives in `Reporter`; `TestRunner` contains zero display logic. This means swapping the reporter (e.g. for a silent CI mode or a streaming SaaS reporter) requires no changes to the runner.

`TestRunner.run()` returns a `boolean` (all-passed) rather than calling `process.exit()` directly; the entry point `main.ts` owns the process lifecycle.

### Scoped Logger per test

`Logger` (`src/logger/logger.ts`) is a simple accumulator: `info()` / `error()` append a `LogEntry` with an ISO timestamp. A fresh `Logger` instance is created at the top of `runTestFile` before spawning the child process, so its entries are entirely isolated to that one test — no shared state, no locking needed. `testLogger.getEntries()` is returned as `TestResult.logs` and flows straight into the JSON report.

`TestRunner` also holds a `runnerLogger` instance for its own lifecycle events (discovery, concurrency config). These are stored as structured entries in case they are needed downstream (e.g. surfacing runner errors to a SaaS), but are only printed to stdout when `--verbose` is on since they are operational noise in normal mode.

### Verbose vs default output

- **Default**: real-time `→ RUNNING` and `✓/✗` events per test as they complete, then the final summary. Stdout/stderr are shown in the summary for failed tests only.
- **Verbose**: additionally prints runner config (file count, concurrency, timeout) and stdout/stderr in real-time after each test completes.

---

## What I would improve with more time

- **Retry support**: the spec mentions `attempts` in the JSON report. The field is wired through but retries are not implemented. A configurable `--retries` flag with exponential backoff would make flaky test handling explicit rather than relying on re-running the whole suite.

- **Streaming JSON report**: currently `report.json` is written atomically at the end. For long runs, a SaaS integration would benefit from streaming results as each test finishes, so the platform can show live status rather than waiting for the full run.

- **Test file sorting / ordering**: `glob` returns files in filesystem order. Slowest-first scheduling (based on previous run data stored in a cache file) would minimise wall-clock time when concurrency is limited.

- **Proper error handling for invalid directory**: currently passing a non-existent directory silently produces "no test files found". It should distinguish between an empty directory and a path that does not exist.

- **Unit tests for the runner itself**: the worker pool logic, timeout behaviour, and exit code mapping are currently only validated manually. Wrapping `runTestFile` to accept an injectable spawn function would make these straightforwardly testable.
