#!/usr/bin/env node
/**
 * Stop hook — срабатывает когда Claude завершает свой ход.
 *
 * Claude Code передаёт в stdin JSON payload со следующими полями:
 *   - cwd          : рабочая директория сессии
 *   - session_id   : UUID текущей CLI-сессии (совпадает с cliSessionId в claude-code-sessions)
 *   - transcript_path : путь к JSONL файлу транскрипта (~/.claude/projects/.../session.jsonl)
 *
 * Приоритет действий (без бесконечных циклов):
 *   1. Флаг C# файла существует → удалить флаг → запустить /check-code через prompt injection.
 *      Git-изменения остаются; следующий Stop их закоммитит.
 *   2. Флага нет + git имеет незакоммиченные изменения → git add -A + commit.
 *      Заголовок коммита = заглавие текущего чата + временная метка.
 *      Без prompt injection — ноль лишних токенов. Следующий Stop видит чистый репо → выход.
 *   3. Ничего из вышеперечисленного → вывод {} тихо.
 */

import { existsSync, unlinkSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import { execSync } from "node:child_process";

// Флаговый файл создаётся хуком cs-post-edit.mjs когда Claude редактирует .cs файл
const FLAG_PATH = join(homedir(), ".claude", "hooks", ".cs-modified-flag");

/** Возвращает true если репо имеет незакоммиченные изменения (staged или unstaged) */
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

/** Возвращает true если директория является git-репозиторием */
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

/**
 * Ищет заглавие текущего чата по session_id из Stop hook payload.
 *
 * Claude Code (Electron) хранит метаданные сессий в:
 *   %APPDATA%\Claude\claude-code-sessions\<group>\<subgroup>\local_<uuid>.json
 *
 * Каждый JSON-файл содержит:
 *   - cliSessionId : UUID CLI-сессии (совпадает с payload.session_id)
 *   - title        : заглавие чата (генерируется автоматически из первого сообщения)
 *   - titleSource  : "auto" | "manual"
 *
 * Итерирует по всем поддиректориям пока не найдёт файл с совпадающим cliSessionId.
 * Возвращает null если заглавие не найдено (fallback → "auto: timestamp").
 */
function getChatTitle(sessionId) {
  try {
    if (!sessionId) return null;
    const base = join(homedir(), "AppData", "Roaming", "Claude", "claude-code-sessions");
    if (!existsSync(base)) return null;
    for (const g1 of readdirSync(base)) {
      const d1 = join(base, g1);
      try { if (!statSync(d1).isDirectory()) continue; } catch { continue; }
      for (const g2 of readdirSync(d1)) {
        const d2 = join(d1, g2);
        try { if (!statSync(d2).isDirectory()) continue; } catch { continue; }
        for (const f of readdirSync(d2)) {
          if (!f.endsWith(".json")) continue;
          try {
            const obj = JSON.parse(readFileSync(join(d2, f), "utf8"));
            if (obj.cliSessionId === sessionId && obj.title) return obj.title;
          } catch { /* пропустить повреждённый файл */ }
        }
      }
    }
  } catch { /* игнорировать ошибки файловой системы */ }
  return null;
}

/**
 * Делает git add -A и коммит.
 * Заголовок коммита = "<заглавие чата>: <дата время>"
 * Fallback если заглавие не найдено = "auto: <дата время>"
 */
function autoCommit(cwd, sessionId) {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  const timestamp =
    `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ` +
    `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;

  const chatTitle = getChatTitle(sessionId);
  const subject = chatTitle
    ? `${chatTitle}: ${timestamp}`
    : `auto: ${timestamp}`;

  execSync(`git -C "${cwd}" add -A`, { timeout: 10000, stdio: "ignore" });
  execSync(`git -C "${cwd}" commit -m "${subject.replace(/"/g, '\\"')}"`, {
    timeout: 15000,
    stdio: "ignore",
  });
}

/** Читает JSON payload из stdin (Claude Code передаёт его при каждом Stop событии) */
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
    // Таймаут на случай если stdin завис
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
    // --- Приоритет 1: C# файл был изменён ---
    // cs-post-edit.mjs создаёт FLAG_PATH с именем файла когда Claude редактирует .cs
    if (existsSync(FLAG_PATH)) {
      const modifiedFile = readFileSync(FLAG_PATH, "utf8").trim();
      unlinkSync(FLAG_PATH);

      // Windows balloon notification (опционально, не критично)
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
      } catch { /* уведомление опционально */ }

      // Prompt injection → Claude запустит /check-code в следующем ходе
      const prompt =
        `A C# file was just modified: ${modifiedFile}\n\n` +
        `Please run /check-code on it now and report any violations.\n` +
        `After the review is done, remind the user to run /context-purge to clean the session.`;

      process.stdout.write(JSON.stringify({ continue: true, prompt }) + "\n");
      return;
    }

    // --- Приоритет 2: незакоммиченные изменения → автокоммит с заглавием чата ---
    if (cwd && isGitRepo(cwd) && gitHasChanges(cwd)) {
      try {
        autoCommit(cwd, payload.session_id || null);
      } catch {
        // Коммит упал (например нечего коммитить после add) — тихо игнорируем
      }
      process.stdout.write("{}\n");
      return;
    }

    // --- Нечего делать ---
    process.stdout.write("{}\n");

  } catch {
    process.stdout.write("{}\n");
  }
}

main();
