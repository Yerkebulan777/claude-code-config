#!/usr/bin/env node
import { readFileSync, unlinkSync, existsSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";

const FLAG_PATH = join(homedir(), ".claude", "hooks", ".cs-modified-flag");

try {
  if (existsSync(FLAG_PATH)) {
    const filePath = readFileSync(FLAG_PATH, "utf8").trim();
    unlinkSync(FLAG_PATH);
    process.stdout.write(
      JSON.stringify({
        decision: "block",
        reason: `C# file modified: ${filePath}. Run /check-code to lint and verify.`,
      }) + "\n"
    );
    process.exit(0);
  }
} catch {
  // never block on hook errors
}

process.stdout.write("{}\n");
