#!/usr/bin/env node
/**
 * PostToolUse hook — detects C# file edits and sets a flag.
 * Fires after Write or Edit tool is used.
 * Flag is consumed by on-stop.mjs to trigger /check-code.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { homedir } from "node:os";

const FLAG_PATH = join(homedir(), ".claude", "hooks", ".cs-modified-flag");

try {
  const raw = readFileSync("/dev/stdin", "utf8");
  const input = JSON.parse(raw);

  const filePath = input?.tool_input?.file_path ?? "";

  if (filePath.endsWith(".cs")) {
    writeFileSync(FLAG_PATH, filePath, "utf8");
  }
} catch {
  // Never block Claude Code on hook errors
}

process.stdout.write("{}\n");
