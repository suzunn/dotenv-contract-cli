import test from "node:test";
import assert from "node:assert/strict";
import { compareContracts } from "../src/contract.js";
import { parseDotenv } from "../src/dotenv.js";

test("parseDotenv handles comments, quotes, and export prefix", () => {
  const source = `
# comment
export API_KEY=abc123
EMPTY=
QUOTED="hello\\nworld"
SINGLE='stay #literal'
UNQUOTED=foo # inline comment
`;

  const parsed = parseDotenv(source, "sample.env");
  assert.equal(parsed.issues.length, 0);
  assert.deepEqual(parsed.entries, {
    API_KEY: "abc123",
    EMPTY: "",
    QUOTED: "hello\nworld",
    SINGLE: "stay #literal",
    UNQUOTED: "foo"
  });
});

test("parseDotenv reports malformed lines", () => {
  const source = "BAD LINE\nGOOD_KEY=value\n1INVALID=yes\n";
  const parsed = parseDotenv(source, "bad.env");

  assert.equal(parsed.issues.length, 2);
  assert.deepEqual(parsed.entries, {
    GOOD_KEY: "value"
  });
});

test("compareContracts finds missing and empty keys", () => {
  const report = compareContracts({
    schemaEntries: {
      TOKEN: "",
      URL: "",
      OPTIONAL: ""
    },
    envEntries: {
      TOKEN: "",
      URL: "https://example.test"
    },
    allowEmpty: new Set(["OPTIONAL"]),
    strict: false
  });

  assert.equal(report.ok, false);
  assert.deepEqual(report.missing, ["OPTIONAL"]);
  assert.deepEqual(report.empty, ["TOKEN"]);
  assert.deepEqual(report.unexpected, []);
});

test("compareContracts strict mode fails on unexpected keys", () => {
  const report = compareContracts({
    schemaEntries: {
      API_KEY: ""
    },
    envEntries: {
      API_KEY: "abc",
      DEBUG: "1"
    },
    strict: true
  });

  assert.equal(report.ok, false);
  assert.deepEqual(report.unexpected, ["DEBUG"]);
});

test("compareContracts passes clean contract", () => {
  const report = compareContracts({
    schemaEntries: {
      API_KEY: "",
      REGION: ""
    },
    envEntries: {
      API_KEY: "abc",
      REGION: "us-east-1"
    },
    strict: true
  });

  assert.equal(report.ok, true);
  assert.deepEqual(report.missing, []);
  assert.deepEqual(report.empty, []);
  assert.deepEqual(report.unexpected, []);
});