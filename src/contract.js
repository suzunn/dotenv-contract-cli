function sortKeys(values) {
  return [...values].sort((left, right) => left.localeCompare(right));
}

/**
 * Compare parsed schema and environment entries and summarize contract failures.
 *
 * @param {{
 *   schemaEntries: Record<string, string>,
 *   envEntries: Record<string, string>,
 *   allowEmpty?: Set<string>,
 *   strict?: boolean
 * }} options Contract comparison inputs.
 * @returns {{
 *   ok: boolean,
 *   strict: boolean,
 *   missing: string[],
 *   empty: string[],
 *   unexpected: string[],
 *   counts: { required: number, provided: number, missing: number, empty: number, unexpected: number }
 * }}
 */
export function compareContracts({ schemaEntries, envEntries, allowEmpty = new Set(), strict = false }) {
  const schemaKeys = Object.keys(schemaEntries);
  const envKeys = Object.keys(envEntries);

  const missing = sortKeys(schemaKeys.filter((key) => !Object.hasOwn(envEntries, key)));
  const empty = sortKeys(
    schemaKeys.filter((key) => Object.hasOwn(envEntries, key) && envEntries[key] === "" && !allowEmpty.has(key))
  );
  const unexpected = sortKeys(envKeys.filter((key) => !Object.hasOwn(schemaEntries, key)));

  const ok = missing.length === 0 && empty.length === 0 && (!strict || unexpected.length === 0);

  return {
    ok,
    strict,
    missing,
    empty,
    unexpected,
    counts: {
      required: schemaKeys.length,
      provided: envKeys.length,
      missing: missing.length,
      empty: empty.length,
      unexpected: unexpected.length
    }
  };
}

/**
 * Format a contract comparison result for human-readable CLI output.
 *
 * @param {ReturnType<typeof compareContracts>} report Contract comparison result.
 * @param {string} envPath Environment file path shown in the report.
 * @param {string} schemaPath Contract file path shown in the report.
 * @returns {string}
 */
export function formatTextReport(report, envPath, schemaPath) {
  const lines = [];
  lines.push(`Contract: ${schemaPath}`);
  lines.push(`Environment: ${envPath}`);
  lines.push(`Required keys: ${report.counts.required}`);
  lines.push(`Provided keys: ${report.counts.provided}`);

  if (report.ok) {
    lines.push("Status: PASS");
    return lines.join("\n");
  }

  lines.push("Status: FAIL");

  if (report.missing.length > 0) {
    lines.push(`Missing (${report.missing.length}): ${report.missing.join(", ")}`);
  }

  if (report.empty.length > 0) {
    lines.push(`Empty (${report.empty.length}): ${report.empty.join(", ")}`);
  }

  if (report.strict && report.unexpected.length > 0) {
    lines.push(`Unexpected (${report.unexpected.length}): ${report.unexpected.join(", ")}`);
  }

  return lines.join("\n");
}
