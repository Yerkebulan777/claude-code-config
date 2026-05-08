#!/usr/bin/env node
/**
 * Stop hook — fires when Claude finishes its turn.
 *
 * Priority order (no infinite loops):
 *   1. C# flag set → delete flag → inject /check-code prompt
 *      Git changes remain; next Stop will catch them.
 *   2. No C# flag + git has uncommitted changes → git add -A + commit with timestamp
 *      No prompt injection — zero extra tokens. Next Stop sees clean repo → exits.
 *   3. Neither → output {} quietly.
 */

import { existsSync, unlinkSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import { execSync } from "node:child_process";

const FLAG_PATH = join(homedir(), ".claude", "hooks", ".cs-modified-flag");

function gitHasChanges(cwd) {
  try {
    const result = execSync(`git -C "${cwd}" status --porcelain`, {
      timeout: 5000,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
    return result.trim().length > 0;
  } catch {
    return false;
  }
}

function isGitRepo(cwd) {
  try {
    execSync(`git -C "${cwd}" rev-parse --git-dir`, {
      timeout: 3000,
      stdio: "ignore",
    });
    return true;
  } catch {
    return false;
  }
}

function autoCommit(cwd) {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  const timestamp =
    `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ` +
    `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;

  execSync(`git -C "${cwd}" add -A`, { timeout: 10000, stdio: "ignore" });
  execSync(`git -C "${cwd}" commit -m "auto: ${timestamp}"`, {
    timeout: 15000,
    stdio: "ignore",
  });
}

async function readStdinJson() {
  return new Promise((resolve) => {
    let data = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk) => (data += chunk));
    process.stdin.on("end", () => {
      try { resolve(JSON.parse(data)); }
      catch { resolve({}); }
    });
    process.stdin.on("error", () => resolve({}));
    setTimeout(() => {
      try { resolve(JSON.parse(data)); }
      catch { resolve({}); }
    }, 500);
  });
}

async function main() {
  const payload = await readStdinJson();
  const cwd = payload.cwd || null;

  try {
    // --- Priority 1: C# file was modified ---
    if (existsSync(FLAG_PATH)) {
      const modifiedFile = readFileSync(FLAG_PATH, "utf8").trim();
      unlinkSync(FLAG_PATH);

      try {
        execSync(
          `powershell -WindowStyle Hidden -Command "` +
          `Add-Type -AssemblyName System.Windows.Forms; ` +
          `$n = New-Object System.Windows.Forms.NotifyIcon; ` +
          `$n.Icon = [System.Drawing.SystemIcons]::Information; ` +
          `$n.Visible = $true; ` +
          `$n.ShowBalloonTip(6000, 'Claude Code', 'C# file modified — running /check-code', 'Info'); ` +
          `Start-Sleep 7; $n.Dispose()"`,
          { detached: true, stdio: "ignore", timeout: 500 }
        );
      } catch { /* notification optional */ }

      const prompt =
        `A C# file was just modified: ${modifiedFile}\n\n` +
        `Please run /check-code on it now and report any violations.\n` +
        `After the review is done, remind the user to run /context-purge to clean the session.`;

      process.stdout.write(JSON.stringify({ continue: true, prompt }) + "\n");
      return;
    }

    // --- Priority 2: git has uncommitted changes → commit with timestamp ---
    if (cwd && isGitRepo(cwd) && gitHasChanges(cwd)) {
      try {
        autoCommit(cwd);
      } catch {
        // Commit failed (e.g. nothing to commit after add) — ignore silently
      }
      process.stdout.write("{}\n");
      return;
    }

    // --- No action needed ---
    process.stdout.write("{}\n");

  } catch {
    process.stdout.write("{}\n");
  }
}

main();
