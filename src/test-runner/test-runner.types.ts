export type TestStatus = "passed" | "failed" | "timeout";

export type LogEntry = {
  timestamp: string;
  level: "info" | "error";
  message: string;
};

export type TestResult = {
  file: string;
  status: TestStatus;
  exitCode: number;
  stdout: string;
  stderr: string;
  duration: number;
  attempts: number;
  logs: LogEntry[];
};
