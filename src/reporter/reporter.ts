import fs from "node:fs";
import path from "node:path";
import { DIM, GREEN, RED, RESET, YELLOW } from "./ansi.js";
import { TestResult, TestStatus } from "../test-runner/test-runner.types.js";

export class Reporter {
  constructor(
    private readonly type: "text" | "json",
    private readonly verbose: boolean,
  ) {}

  onRunStart(fileCount: number, concurrency: number, timeout: number): void {
    if (this.verbose) {
      console.log(`Found ${fileCount} test file(s)`);
      console.log(`Concurrency: ${concurrency}  Timeout: ${timeout}ms`);
    }
  }

  onTestStart(file: string): void {
    console.log(`${DIM}→ RUNNING${RESET} ${file}`);
  }

  onTestComplete(result: TestResult): void {
    const [icon, color] = statusLabel(result.status);
    console.log(
      `${color}${icon}${RESET} ${result.file} ${DIM}(${result.duration}ms)${RESET}`,
    );

    if (this.verbose) {
      if (result.stdout.trim()) {
        console.log(`    stdout: ${result.stdout.trim()}`);
      }
      if (result.stderr.trim()) {
        console.log(`    stderr: ${result.stderr.trim()}`);
      }
    }
  }

  report(results: TestResult[]): void {
    if (this.type === "json") {
      this.writeJsonReport(results);
    }
    this.printTextSummary(results);
  }

  private printTextSummary(results: TestResult[]): void {
    const passed = results.filter((r) => r.status === "passed").length;
    const failed = results.filter((r) => r.status !== "passed").length;
    const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);

    console.log("\n" + "=".repeat(60));
    console.log("Results:\n");

    for (const result of results) {
      const [icon, color] = statusLabel(result.status);
      const suffix =
        result.status === "timeout" ? ` ${YELLOW}[TIMEOUT]${RESET}` : "";

      console.log(
        `  ${color}${icon}${RESET} ${result.file} (${result.duration}ms)${suffix}`,
      );

      if (this.verbose) {
        if (result.stdout.trim()) {
          console.log(`      stdout: ${result.stdout.trim()}`);
        }
        if (result.stderr.trim()) {
          console.log(`      stderr: ${result.stderr.trim()}`);
        }
      }
    }

    console.log(
      `\n${passed} passed, ${failed} failed, ${results.length} total  (${totalDuration}ms)`,
    );
    console.log("=".repeat(60));
  }

  private writeJsonReport(results: TestResult[]): void {
    const passed = results.filter((r) => r.status === "passed").length;
    const report = {
      summary: {
        total: results.length,
        passed,
        failed: results.length - passed,
        duration: results.reduce((sum, r) => sum + r.duration, 0),
      },
      tests: results.map((r) => ({
        file: r.file,
        status: r.status === "passed" ? "passed" : "failed",
        duration: r.duration,
        attempts: r.attempts,
        ...(r.stdout && { stdout: r.stdout }),
        ...(r.stderr && { stderr: r.stderr }),
        ...(r.status === "timeout" && { error: "TIMEOUT" }),
        logs: r.logs,
      })),
    };

    const reportPath = path.join(process.cwd(), "report.json");
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`Report written to ${reportPath}`);
  }
}

function statusLabel(status: TestStatus): [icon: string, color: string] {
  switch (status) {
    case "passed":
      return ["✓ PASS", GREEN];
    case "timeout":
      return ["✗ TIMEOUT", RED];
    case "failed":
      return ["✗ FAIL", RED];
  }
}
