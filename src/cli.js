import { readFile } from "node:fs/promises";
import { compareContracts, formatTextReport } from "./contract.js";
import { parseDotenv } from "./dotenv.js";

const VERSION = "0.1.0";

function printUsage(stream) {
  stream.write(`dotenv-contract v${VERSION}\n\n`);
  stream.write("Validate an .env file against a contract file (.env.example by default).\n\n");
  stream.write("Usage:\n");
  stream.write("  dotenv-contract [options]\n\n");
  stream.write("Options:\n");
  stream.write("  --env <path>          Path to environment file (default: .env)\n");
  stream.write("  --schema <path>       Path to contract file (default: .env.example)\n");
  stream.write("  --strict              Fail on extra keys not listed in contract\n");
  stream.write("  --allow-empty <keys>  Comma-separated keys allowed to be empty\n");
  stream.write("  --format <text|json>  Output format (default: text)\n");
  stream.write("  --quiet               Suppress human-readable text output\n");
  stream.write("  --help                Show usage\n");
  stream.write("  --version             Print version\n");
}

function parseArgs(argv) {
  const options = {
    envPath: ".env",
    schemaPath: ".env.example",
    strict: false,
    allowEmpty: new Set(),
    format: "text",
    quiet: false,
    help: false,
    version: false
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--help" || arg === "-h") {
      options.help = true;
      continue;
    }

    if (arg === "--version" || arg === "-v") {
      options.version = true;
      continue;
    }

    if (arg === "--strict") {
      options.strict = true;
      continue;
    }

    if (arg === "--quiet") {
      options.quiet = true;
      continue;
    }

    if (arg === "--env" || arg === "--schema" || arg === "--allow-empty" || arg === "--format") {
      const value = argv[index + 1];
      if (!value || value.startsWith("--")) {
        throw new Error(`Missing value for ${arg}.`);
      }

      if (arg === "--env") {
        options.envPath = value;
      }

      if (arg === "--schema") {
        options.schemaPath = value;
      }

      if (arg === "--allow-empty") {
        const keys = value
          .split(",")
          .map((entry) => entry.trim())
          .filter(Boolean);
        for (const key of keys) {
          options.allowEmpty.add(key);
        }
      }

      if (arg === "--format") {
        if (value !== "text" && value !== "json") {
          throw new Error("--format must be either 'text' or 'json'.");
        }
        options.format = value;
      }

      index += 1;
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  return options;
}

function printIssues(issues, stream) {
  for (const issue of issues) {
    stream.write(`${issue.source}:${issue.line}: ${issue.message}\n`);
  }
}

export async function runCli(argv, stdout, stderr) {
  let options;

  try {
    options = parseArgs(argv);
  } catch (error) {
    stderr.write(`Argument error: ${error.message}\n\n`);
    printUsage(stderr);
    return 2;
  }

  if (options.help) {
    printUsage(stdout);
    return 0;
  }

  if (options.version) {
    stdout.write(`${VERSION}\n`);
    return 0;
  }

  let schemaText;
  let envText;

  try {
    [schemaText, envText] = await Promise.all([
      readFile(options.schemaPath, "utf8"),
      readFile(options.envPath, "utf8")
    ]);
  } catch (error) {
    stderr.write(`File error: ${error.message}\n`);
    return 2;
  }

  const parsedSchema = parseDotenv(schemaText, options.schemaPath);
  const parsedEnv = parseDotenv(envText, options.envPath);
  const parseIssues = [...parsedSchema.issues, ...parsedEnv.issues];

  if (parseIssues.length > 0) {
    printIssues(parseIssues, stderr);
    return 2;
  }

  const report = compareContracts({
    schemaEntries: parsedSchema.entries,
    envEntries: parsedEnv.entries,
    strict: options.strict,
    allowEmpty: options.allowEmpty
  });

  if (options.format === "json") {
    stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  } else if (!options.quiet) {
    stdout.write(`${formatTextReport(report, options.envPath, options.schemaPath)}\n`);
  }

  return report.ok ? 0 : 1;
}