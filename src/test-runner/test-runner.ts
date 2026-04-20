import { globSync } from "glob";
import { spawn } from "node:child_process";
import path from "node:path";
import { Logger } from "../logger/logger.js";
import { Reporter } from "../reporter/reporter.js";
import { TestResult, TestStatus } from "./test-runner.types.js";

export class TestRunner {
  constructor(
    private readonly directory: string,
    private readonly concurrency: number,
    private readonly timeout: number,
    private readonly reporter: Reporter,
  ) {}

  async run(): Promise<boolean> {
    const testFiles = this.findTestFiles();

    if (testFiles.length === 0) {
      console.log(`No test files found in ${this.directory}`);
      return true;
    }

    this.reporter.onRunStart(testFiles.length, this.concurrency, this.timeout);

    const results = await this.runTestFiles(testFiles);

    this.reporter.report(results);

    return results.every((r) => r.status === "passed");
  }

  private findTestFiles(): string[] {
    return globSync("**/*.test.js", {
      cwd: this.directory,
      absolute: false,
    });
  }

  private async runTestFiles(testFiles: string[]): Promise<TestResult[]> {
    const results: TestResult[] = new Array(testFiles.length);
    let nextIndex = 0;

    const worker = async (): Promise<void> => {
      for (;;) {
        const i = nextIndex++;
        if (i >= testFiles.length) return;

        const file = testFiles[i];
        this.reporter.onTestStart(file);

        const result = await this.runTestFile(file);
        results[i] = result;

        this.reporter.onTestComplete(result);
      }
    };

    const workerCount = Math.min(
      Math.max(1, this.concurrency),
      testFiles.length,
    );
    await Promise.all(Array.from({ length: workerCount }, () => worker()));
    return results;
  }

  private async runTestFile(file: string): Promise<TestResult> {
    const testLogger = new Logger();
    const startTime = Date.now();
    const absolutePath = path.resolve(this.directory, file);

    return new Promise((resolve) => {
      let stdout = "";
      let stderr = "";
      let timedOut = false;

      testLogger.info("Test started");

      const child = spawn("node", [absolutePath], {
        stdio: ["ignore", "pipe", "pipe"],
      });

      const timer = setTimeout(() => {
        timedOut = true;
        child.kill();
      }, this.timeout);

      child.stdout?.on("data", (data: Buffer) => {
        stdout += data.toString();
      });

      child.stderr?.on("data", (data: Buffer) => {
        stderr += data.toString();
      });

      child.on("close", (code) => {
        clearTimeout(timer);
        const duration = Date.now() - startTime;

        let status: TestStatus;
        let exitCode: number;

        if (timedOut) {
          status = "timeout";
          exitCode = 124;
          testLogger.error(`Test timed out after ${this.timeout}ms`);
        } else if (code === 0) {
          status = "passed";
          exitCode = 0;
          testLogger.info("Test passed");
        } else {
          status = "failed";
          exitCode = code ?? 1;
          testLogger.error("Test failed");
        }

        resolve({
          file,
          status,
          exitCode,
          stdout,
          stderr,
          duration,
          attempts: 1,
          logs: testLogger.getEntries(),
        });
      });

      child.on("error", (err) => {
        clearTimeout(timer);
        const duration = Date.now() - startTime;
        testLogger.error(`Process error: ${err.message}`);

        resolve({
          file,
          status: "failed",
          exitCode: 1,
          stdout,
          stderr: stderr + err.message,
          duration,
          attempts: 1,
          logs: testLogger.getEntries(),
        });
      });
    });
  }
}
