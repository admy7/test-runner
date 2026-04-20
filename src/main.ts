import { CommandLineClient } from "./command-line/command-line.js";
import { definedArguments } from "./config/config.js";
import { Reporter } from "./reporter/reporter.js";
import { TestRunner } from "./test-runner/test-runner.js";

async function main() {
  const cli = new CommandLineClient(definedArguments);

  const rawCommandLineArgs = process.argv.slice(2);

  const {
    args: { directory, concurrency, timeout, reporter: reporterType, verbose },
    errors,
  } = cli.parse(rawCommandLineArgs);

  if (errors.length > 0) {
    for (const error of errors) {
      console.error(error);
    }
    process.exit(1);
  }

  const reporter = new Reporter(reporterType, verbose);
  const runner = new TestRunner(directory, concurrency, timeout, reporter);

  const allPassed = await runner.run();
  process.exit(allPassed ? 0 : 1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
