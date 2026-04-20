export interface CommandLine {
  parse(rawArgs: string[]): {
    args: Record<string, string | number | boolean>;
    errors: string[];
  };
}

export type CommandLineArgument = {
  name: string;
  description: string;
  parse?: (value: string, _previous: unknown) => string | number | boolean;
  defaultValue: string | number | boolean;
  type: "argument" | "option";
};
