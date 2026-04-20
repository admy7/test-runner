import { Command } from "commander";
import { CommandLine, CommandLineArgument } from "./command-line.types.js";

export class CommandLineClient implements CommandLine {
  private readonly client: Command;
  private readonly errors: string[] = [];

  constructor(allowedArguments: CommandLineArgument[]) {
    this.client = new Command()
      .name("my-runner")
      .description("A simple test runner")
      .showHelpAfterError(true);

    allowedArguments.forEach((argument) => {
      if (argument.type === "argument") {
        this.client.argument(argument.name, argument.description);
      } else {
        if (argument.parse) {
          this.client.option(
            argument.name,
            argument.description,
            argument.parse,
            argument.defaultValue,
          );
        } else {
          this.client.option(
            argument.name,
            argument.description,
            argument.defaultValue as string | boolean | string[],
          );
        }
      }
    });
  }

  parse(rawArgs: string[]): {
    args: {
      directory: string;
      concurrency: number;
      timeout: number;
      reporter: "text" | "json";
      verbose: boolean;
    };
    errors: string[];
  } {
    const errors = [];
    try {
      this.client.parse(rawArgs, { from: "user" });
    } catch (err) {
      if (err instanceof Error) {
        errors.push(err.message);
      } else {
        errors.push(String(err));
      }
    }

    const opts = this.client.opts();
    const [directory] = this.client.args;

    return {
      args: {
        directory,
        concurrency: opts.concurrency,
        timeout: opts.timeout,
        reporter: opts.reporter,
        verbose: opts.verbose,
      },
      errors,
    };
  }
}
