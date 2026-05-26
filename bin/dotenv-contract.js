#!/usr/bin/env node
import { runCli } from "../src/cli.js";

runCli(process.argv.slice(2), process.stdout, process.stderr)
  .then((code) => {
    process.exitCode = code;
  })
  .catch((error) => {
    process.stderr.write(`Unexpected error: ${error.message}\n`);
    process.exitCode = 2;
  });