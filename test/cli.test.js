import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { runCli } from "../src/cli.js";

function createWritableStream() {
  let output = "";
  return {
    stream: {
      write(chunk) {
        output += chunk;
      }
    },
    read() {
      return output;
    }
  };
}

async function withTempDir(callback) {
  const dir = await mkdtemp(join(tmpdir(), "dotenv-contract-cli-"));
  try {
    return await callback(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

test("runCli returns success and writes text report for a valid contract", async () => {
  await withTempDir(async (dir) => {
    const schemaPath = join(dir, ".env.example");
    const envPath = join(dir, ".env");
    await writeFile(schemaPath, "API_KEY=\nREGION=\n", "utf8");
    await writeFile(envPath, "API_KEY=abc\nREGION=us-east-1\n", "utf8");

    const stdout = createWritableStream();
    const stderr = createWritableStream();
    const code = await runCli(["--schema", schemaPath, "--env", envPath], stdout.stream, stderr.stream);

    assert.equal(code, 0);
    assert.match(stdout.read(), /Status: PASS/);
    assert.equal(stderr.read(), "");
  });
});

test("runCli returns failure and JSON details for contract violations", async () => {
  await withTempDir(async (dir) => {
    const schemaPath = join(dir, ".env.example");
    const envPath = join(dir, ".env");
    await writeFile(schemaPath, "API_KEY=\nREGION=\n", "utf8");
    await writeFile(envPath, "API_KEY=\nEXTRA=true\n", "utf8");

    const stdout = createWritableStream();
    const stderr = createWritableStream();
    const code = await runCli(
      ["--schema", schemaPath, "--env", envPath, "--strict", "--format", "json"],
      stdout.stream,
      stderr.stream
    );

    const report = JSON.parse(stdout.read());
    assert.equal(code, 1);
    assert.deepEqual(report.missing, ["REGION"]);
    assert.deepEqual(report.empty, ["API_KEY"]);
    assert.deepEqual(report.unexpected, ["EXTRA"]);
    assert.equal(stderr.read(), "");
  });
});

test("runCli returns usage error for invalid arguments", async () => {
  const stdout = createWritableStream();
  const stderr = createWritableStream();
  const code = await runCli(["--format", "yaml"], stdout.stream, stderr.stream);

  assert.equal(code, 2);
  assert.equal(stdout.read(), "");
  assert.match(stderr.read(), /Argument error: --format must be either 'text' or 'json'\./);
});

test("runCli reports file-read errors without throwing", async () => {
  const stdout = createWritableStream();
  const stderr = createWritableStream();
  const code = await runCli(["--schema", "missing.example", "--env", "missing.env"], stdout.stream, stderr.stream);

  assert.equal(code, 2);
  assert.equal(stdout.read(), "");
  assert.match(stderr.read(), /File error:/);
});
