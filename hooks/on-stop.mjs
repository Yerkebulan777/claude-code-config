#!/usr/bin/env node
/**
 * Stop hook — fires when Claude finishes its turn.
 *
 * Logic (no infinite loop):
 *   1. Check if .cs-modified-flag exists (set by cs-post-edit.mjs).
 *   2. If yes → delete the flag immediately → inject /check-code prompt.
 *      Next Stop call won't find the flag → outputs {} → loop ends.
 *   3. If no flag → output {} quietly.
 *
 * After /check-code Claude stops again. Flag is gone → no re-trigger.
 * User manually runs /context-purge when ready to clean the session.
 */

import { existsSync, unlinkSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import { execSync } from "node:child_process";

const FLAG_PATH = join(homedir(), ".claude", "hooks", ".cs-modified-flag");

try {
  if (existsSync(FLAG_PATH)) {
    // Read which file was modified before deleting
    const modifiedFile = readFileSync(FLAG_PATH, "utf8").trim();

    // Delete flag immediately — prevents re-trigger on next Stop
    unlinkSync(FLAG_PATH);

    // Windows toast notification (non-blocking, background process)
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
    } catch {
      // Notification is optional — never block on failure
    }

    // Inject /check-code as the next Claude turn
    const prompt =
      `A C# file was just modified: ${modifiedFile}\n\n` +
      `Please run /check-code on it now and report any violations.\n` +
      `After the review is done, remind the user to run /context-purge to clean the session.`;

    process.stdout.write(
      JSON.stringify({ continue: true, prompt }) + "\n"
    );

  } else {
    // No C# files modified — do nothing
    process.stdout.write("{}\n");
  }
} catch {
  process.stdout.write("{}\n");
}
