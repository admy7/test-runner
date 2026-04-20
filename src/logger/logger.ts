import { LogEntry } from "../test-runner/test-runner.types.js";

export class Logger {
  private readonly _entries: LogEntry[] = [];

  info(message: string): void {
    this._entries.push({
      timestamp: new Date().toISOString(),
      level: "info",
      message,
    });
  }

  error(message: string): void {
    this._entries.push({
      timestamp: new Date().toISOString(),
      level: "error",
      message,
    });
  }

  getEntries(): LogEntry[] {
    return [...this._entries];
  }
}
