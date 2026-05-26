const ENV_KEY_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*$/;

function parseDoubleQuotedValue(rawValue) {
  return rawValue
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "\r")
    .replace(/\\t/g, "\t")
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, "\\");
}

function stripInlineComment(rawValue) {
  let result = "";
  for (let index = 0; index < rawValue.length; index += 1) {
    const char = rawValue[index];
    const previous = index > 0 ? rawValue[index - 1] : "";
    if (char === "#" && (index === 0 || /\s/.test(previous))) {
      break;
    }
    result += char;
  }
  return result.trimEnd();
}

export function parseDotenv(text, source = "input") {
  const lines = text.split(/\r?\n/);
  const entries = {};
  const issues = [];

  for (let lineNumber = 1; lineNumber <= lines.length; lineNumber += 1) {
    const originalLine = lines[lineNumber - 1];
    const trimmed = originalLine.trim();

    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const line = trimmed.startsWith("export ") ? trimmed.slice(7).trimStart() : trimmed;
    const equalsIndex = line.indexOf("=");

    if (equalsIndex === -1) {
      issues.push({
        source,
        line: lineNumber,
        message: "Missing '=' separator."
      });
      continue;
    }

    const key = line.slice(0, equalsIndex).trim();
    let value = line.slice(equalsIndex + 1).trim();

    if (!ENV_KEY_PATTERN.test(key)) {
      issues.push({
        source,
        line: lineNumber,
        message: `Invalid variable name '${key}'.`
      });
      continue;
    }

    if (Object.hasOwn(entries, key)) {
      issues.push({
        source,
        line: lineNumber,
        message: `Duplicate variable '${key}' (last value wins).`
      });
    }

    if (value.startsWith('"')) {
      if (!(value.endsWith('"') && value.length >= 2)) {
        issues.push({
          source,
          line: lineNumber,
          message: "Unterminated double-quoted value."
        });
        continue;
      }
      value = parseDoubleQuotedValue(value.slice(1, -1));
    } else if (value.startsWith("'")) {
      if (!(value.endsWith("'") && value.length >= 2)) {
        issues.push({
          source,
          line: lineNumber,
          message: "Unterminated single-quoted value."
        });
        continue;
      }
      value = value.slice(1, -1);
    } else {
      value = stripInlineComment(value);
    }

    entries[key] = value;
  }

  return { entries, issues };
}