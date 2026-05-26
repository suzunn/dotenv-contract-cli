import { readdirSync, statSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join, extname } from "node:path";

const root = process.cwd();
const scanDirs = ["bin", "src", "test", "scripts"];

function collectJsFiles(dir, acc = []) {
  for (const item of readdirSync(dir)) {
    const fullPath = join(dir, item);
    const stats = statSync(fullPath);
    if (stats.isDirectory()) {
      collectJsFiles(fullPath, acc);
      continue;
    }

    if (extname(item) === ".js") {
      acc.push(fullPath);
    }
  }

  return acc;
}

const files = scanDirs.flatMap((dir) => collectJsFiles(join(root, dir)));

if (files.length === 0) {
  process.stdout.write("No JavaScript files found to lint.\n");
  process.exit(0);
}

const result = spawnSync(process.execPath, ["--check", ...files], {
  stdio: "inherit"
});

process.exit(result.status ?? 1);