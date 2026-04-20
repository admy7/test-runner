import { CommandLineArgument } from "../command-line/command-line.types.js";

export const definedArguments = [
  {
    name: "[directory]",
    description: "Test directory",
    defaultValue: "./tests",
    type: "argument",
  },
  {
    name: "--concurrency <number>",
    description: "Number of concurrent tests",
    parse: parsePositiveInt,
    defaultValue: 1,
    type: "option",
  },
  {
    name: "--timeout <ms>",
    description: "Timeout in milliseconds",
    parse: parsePositiveInt,
    defaultValue: 30_000,
    type: "option",
  },
  {
    name: "--reporter <type>",
    description: "Reporter type (text or json)",
    parse: parseReporter,
    defaultValue: "text" as "text" | "json",
    type: "option",
  },
  {
    name: "--verbose",
    description: "Enable verbose output",
    defaultValue: false,
    type: "option",
  },
] as const satisfies CommandLineArgument[];

function parsePositiveInt(value: string, _previous: unknown): number {
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1) {
    throw new Error(
      `must be a positive integer (got ${JSON.stringify(value)})`,
    );
  }
  return n;
}

export function parseReporter(value: string): "text" | "json" {
  if (value === "text" || value === "json") return value;
  throw new Error(`must be "text" or "json" (got ${JSON.stringify(value)})`);
}
