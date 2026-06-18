---
name: autocad-log-diagnosis
description: Use when the user attaches an AutoCAD/AutoBIMFusion plugin log file (.log) and asks to analyze errors, diagnose failures, or fix bugs. Extracts error patterns from merge logs, maps them to source code, and proposes targeted fixes.
---

# AutoCAD Plugin Log Diagnosis

## When to Use

- User shares a `.log` file from `AutoBIMFusion.bundle/Contents/Logs/` or `Documents\AutoBIMFusion\Logs\`
- User says "проанализируй ошибки", "почему ошибка", "diagnose", "analyze errors", or pastes a log excerpt
- User attaches a log and asks to fix a specific bug (e.g., scale, coordinate, dimension style issues)

## Workflow

### Step 1 — Read and Parse the Log

1. Read the full log file (use `Read` tool with high limit — logs can be large).
2. Extract all error/warning entries. Common patterns:
   - `ERROR` / `WARN` / `EXCEPTION` lines
   - Stack traces starting with `   at ` or `   в ` (Russian locale)
   - `HResult=0x` error codes
   - Specific AutoCAD API exceptions: `Autodesk.AutoCAD.Runtime.Exception`, `ObjectDisposedException`, `InvalidOperationException`
3. Group errors by type and frequency. Identify the **root cause** (not just symptoms).

### Step 2 — Map Errors to Source Code

1. For each unique error, trace the stack trace to the source file:
   - Extract class and method names from the stack trace
   - Use `Grep` to find the method in the codebase
   - Read the surrounding code (30-50 lines around the error location)
2. For AutoBIMFusion, key high-blast-radius files:
   - `CombineOrchestrator.cs` — main merge orchestration
   - `BlockInserter.cs` — block copy/paste logic
   - `LayoutProjectionProcessor.cs` — viewport/layout handling
   - `DimensionStyleNormalizer.cs` — dimension style logic
   - `LoggerFactory.cs` — logging infrastructure

### Step 3 — Diagnose Root Cause

Common AutoBIMFusion error categories:

| Symptom | Likely cause |
|---------|-------------|
| `OptionsValidationException: Token is required` | Missing `appsettings.json` or env var |
| `ObjectDisposedException` | Document or database accessed after disposal |
| Scale/coordinate overflow after merge | `Dimlfac` not reset, viewport scale bleed, or aux VP not filtered |
| `GetOrCreateTextStyle` failure | Thread-safety issue — AutoCAD API must be on main thread |
| Garbage segments outside sheet boundary | Paper space processed before model space; aux VP not filtered |
| UI freeze on confirm button | Async operation blocking the UI thread; need async file search |

### Step 4 — Propose Fix

1. State the root cause clearly (1-2 sentences).
2. Show the exact code change needed (diff format).
3. If the fix involves AutoCAD API, verify:
   - Is it on the main thread? (All AutoCAD API calls must be main-thread)
   - Is `DocumentLock` used for write operations?
   - Are system variables restored after temporary changes?

### Step 5 — Validate

After applying the fix:
1. Build: `dotnet build <solution> -c <config> --no-restore`
2. Check for compilation errors
3. If user has a diagnostic test script, suggest running it

## Log File Locations

| Source | Path |
|--------|------|
| AutoBIMFusion plugin logs | `%AppData%\Autodesk\ApplicationPlugins\AutoBIMFusion.bundle\Contents\Logs\merge-YYYY-MM-DD*.log` |
| Local diagnostic logs | `%USERPROFILE%\Documents\AutoBIMFusion\Logs\` |
| TelegramBot worker logs | `%USERPROFILE%\Documents\TelegramBot\Logs\Worker\` |

## Tips

- Always read the **full** log first — partial reads miss correlated errors.
- Look for the **first** error in a chain — later errors are often cascading failures.
- When the user says "баг остался" (bug persists), re-read the log — the fix may have introduced a new error path.
- For Russian-locale systems, stack traces use `в` instead of `at`.
