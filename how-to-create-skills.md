# How to Create Claude Code Skills and Slash Commands

A complete guide for replicating the C# development toolkit (`csharp-standards`, `/check-code`, `/optimize-code`)
on any machine or for any AI agent working with Claude Code.

---

## Overview

Claude Code supports two types of global AI instructions:

| Type | Trigger | Storage location |
|---|---|---|
| **Skill** | Auto-triggered when description matches the task | `AppData/Roaming/Claude/.../skills/<name>/SKILL.md` |
| **Slash command** | User types `/<name>` explicitly | `~/.claude/commands/<name>.md` |

---

## Part 1 — Create a Skill (auto-trigger)

Skills are loaded automatically when Claude decides the skill description matches the current task.
They appear in the session with the prefix `anthropic-skills:<name>`.

### Step 1: Find the skills plugin directory

Run this to find the correct path:

```bash
find "$APPDATA/Claude/local-agent-mode-sessions/skills-plugin" -type d -name "skills"
# Result example:
# /c/Users/<username>/AppData/Roaming/Claude/local-agent-mode-sessions/skills-plugin/<plugin-uuid>/<install-uuid>/skills/
```

The path contains two UUIDs:
- First UUID = plugin ID (same for all users with the same plugin)
- Second UUID = install/workspace ID (unique per machine)

### Step 2: Create the skill directory

```bash
SKILLS_DIR="/c/Users/<username>/AppData/Roaming/Claude/local-agent-mode-sessions/skills-plugin/<plugin-uuid>/<install-uuid>/skills"
mkdir -p "$SKILLS_DIR/csharp-standards"
```

### Step 3: Write SKILL.md

The file **must** have YAML frontmatter with `name` and `description`.
The `description` is the trigger — write it clearly so Claude knows when to apply the skill automatically.

Save to: `$SKILLS_DIR/csharp-standards/SKILL.md`

```
---
name: csharp-standards
description: >
  C# development expert. Apply this skill automatically whenever you write, edit, or review C# code,
  work with .cs files, .csproj projects, or the user asks for help with C# classes, methods, services,
  repositories, or algorithms. This skill defines mandatory code quality standards — apply them proactively
  without waiting to be asked.
---

# C# Development Standards

You are a C# expert. Always follow these rules when writing or editing code.

## 1. Simplicity First & DRY

Goal: minimal code, maximum clarity.

- Extract repeated logic into static utility classes (static class).
- Follow SRP strictly: keep math and business logic separate from DB, file, and API operations.
- Call utility methods directly — do not create wrapper classes that add no logic.
- Three similar methods = signal to extract a shared helper. One similar line = not a reason.

Bad:
    public class MathWrapper
    {
        private readonly Calculator _calc;
        public double Add(double a, double b) => _calc.Add(a, b); // pointless wrapper
    }

Good: call Calculator.Add() directly.

## 2. Stability & Memory Management

Top priority — stable operation with no memory leaks.

Always wrap IDisposable objects in using:
  - DB connections: SqlConnection, DbContext, OracleConnection
  - Transactions: DbTransaction, SqlTransaction, any ITransaction
  - Streams: Stream, StreamReader, StreamWriter, BinaryReader, BinaryWriter
  - HTTP: HttpClient, HttpResponseMessage
  - Any Revit API object implementing IDisposable

    // Correct
    using var connection = new SqlConnection(connectionString);
    using var transaction = connection.BeginTransaction();

- Never use async void — always async Task.
- Prefer IEnumerable<T> over List<T> in method signatures when the collection is read-only.

## 3. Error Handling

Principle: guard clauses over exceptions.

- Use try/catch ONLY in genuinely dangerous locations: IO, external APIs, network, DB transactions.
- Always catch specific exception types, never bare Exception:

    catch (SqlException ex) when (ex.Number == 1205) // deadlock
    catch (HttpRequestException ex)

- Keep logic inside try blocks minimal.
- Never wrap pure math or business logic in try/catch.

Guard clauses first:
    if (items == null || items.Count == 0) return;
    ProcessItems(items);

Avoid redundant null checks for objects guaranteed non-null:
    // Bad — parameter cannot be null here
    if (parameter != null) parameter.Execute();

    // Good — validate only at system boundary
    public void Process(string input)
    {
        if (string.IsNullOrWhiteSpace(input))
            throw new ArgumentException("Input required", nameof(input));
    }

## 4. Logging & Comments

Logging inside loops — use StringBuilder only:
    // Bad
    foreach (var item in items)
        logger.Log("Processing: " + item.Name + " id=" + item.Id);

    // Good
    var sb = new StringBuilder();
    foreach (var item in items)
        sb.AppendLine($"Processing: {item.Name} id={item.Id}");
    logger.Log(sb.ToString());

Comments:
- Write in Russian, keep them short.
- Explain WHY (the reason for the decision), not WHAT (already visible from the code).

    // Bad: Sums the list of numbers
    public double Sum(IEnumerable<double> values) { ... }

    // Good: Revit API returns area in ft2, converting to m2
    public double ToSquareMeters(double squareFeet) => squareFeet * 0.0929;

## Quick Reference

| Rule          | Do                            | Don't                        |
|---------------|-------------------------------|------------------------------|
| Resources     | using var x = ...             | Forget Dispose()             |
| Loop logging  | StringBuilder                 | String concatenation         |
| Errors        | catch (SqlException ex)       | catch (Exception) everywhere |
| Null checks   | Validate at system boundary   | Check obviously-non-null     |
| Utilities     | Call static class directly    | Pointless wrapper classes    |
```

### Step 4: Verify the skill is loaded

Open a new Claude Code session. In the system skills list you should see:

    anthropic-skills:csharp-standards — C# development expert. Apply this skill automatically...

---

## Part 2 — Create Slash Commands

Slash commands are plain markdown files stored in `~/.claude/commands/`.
The filename becomes the command: `check-code.md` → `/check-code`.

### Directory layout

    ~/.claude/commands/
    ├── check-code.md       →  /check-code
    └── optimize-code.md    →  /optimize-code

---

### Command 1: /check-code

File: `~/.claude/commands/check-code.md`

```
# /check-code — C# Code Review

Perform a strict code review of the current or selected C# code against the project's development standards.

## What to check

### 1. Resource Management (IDisposable)
Find all objects implementing IDisposable:
- DB connections: SqlConnection, DbContext, OracleConnection
- Transactions: DbTransaction, SqlTransaction, any ITransaction
- Streams: Stream, StreamReader, StreamWriter, BinaryReader, BinaryWriter
- HTTP: HttpClient, HttpResponseMessage
- Any Revit API object implementing IDisposable

Verify each is wrapped in using. Exception: objects whose lifecycle is intentionally managed externally (DI container).

### 2. Error Handling
- try/catch must appear only at genuinely dangerous locations: IO, external API, network, DB transactions.
- catch (Exception) without a type filter is always a violation — catch a specific type.
- catch block with no logging or handling is a violation ("swallowed exception").
- Log messages inside try must be concise: operation name + key parameters only.

### 3. Code Cleanliness
- Wrapper classes that only delegate calls without adding logic — DRY/SRP violation.
- Redundant null checks: if an object is guaranteed non-null by DI or a prior guard, the check is noise.
- Duplicate code (3+ similar blocks) must be extracted into a utility method or static class.
- StringBuilder is required for logging inside loops. String concatenation in a loop is a violation.

### 4. Additional (flag if noticed)
- async void instead of async Task — violation.
- Comments that describe what instead of why — remove them.
- Unused using directives — flag for cleanup.

## Output format

Start with a one-sentence overall assessment of the code quality.

Then list each violation:

[N]. [Category] — [Short description]
- Location: ClassName.MethodName, line ~N
- Problem: what exactly is wrong
- Fix: show the corrected version (brief code snippet)

If no violations found — state this explicitly and confirm the code meets the standards.

End with a summary: total violation count, which are critical (memory leaks, hidden errors)
vs non-critical (style, readability).
```

---

### Command 2: /optimize-code

File: `~/.claude/commands/optimize-code.md`

```
# /optimize-code — C# Codebase Optimizer

Refactor and optimize the current or selected C# code.
Goal: less code, better readability, lower memory usage.

## What to analyze

### 1. Algorithm Simplification
Simplify the main algorithm implementation WITHOUT changing its functionality —
the output must remain identical, only the implementation changes:
- Nested loops replaceable with LINQ or a dictionary without behavior loss.
- Recursion without memoization where iteration produces the same result with a smaller stack.
- if/else if chains replaceable with a dictionary or switch expression with the same outcome.
- Single-use intermediate variables that only obscure readability.

If a simplification would change behavior (ordering, edge cases, exceptions) —
do NOT apply it; flag it explicitly instead.

### 2. Dead Code Removal
Find and mark for deletion:
- private methods with no call sites.
- Fields and properties that are declared but never read.
- Commented-out old code (// old version, // TODO: delete).
- Stale comments describing behavior that no longer exists in the code.
- Unused using directives.

### 3. Duplication Elimination
Find code blocks repeated 2+ times:
- Identical logic in different methods → extract to a private static helper or static utility class.
- Repeated guard conditions → generalize.
- Similar classes with the same structure → consider a generic or base class.

Show exactly what is duplicated, where, and provide the consolidated version.

### 4. Memory & Performance Optimization
- String concatenation in a loop → StringBuilder.
- List<T>.Contains() in a loop → HashSet<T>.
- Value computed multiple times → cache in a local variable.
- ToList() where IEnumerable<T> is sufficient → remove unnecessary allocation.
- IDisposable objects without using → add it.
- Large objects in fields needed only within a single method → move to local variables.

## Output format

Start with a brief description in Russian: what exactly you are going to change and why,
organized by the sections above.

Then provide the complete optimized code — not a patch or diff, but the full ready-to-use
file or method. For large files, output only the changed sections with line numbers.

For each change, briefly explain WHY it improves the code (not what changed, but why it is better).

If a section does not apply to the current code — state this explicitly.
```

---

## Part 3 — Verification Checklist

After creating all files, open a new Claude Code session and verify:

    [ ] anthropic-skills:csharp-standards  appears in the skills list
    [ ] /check-code     works when typed in chat
    [ ] /optimize-code  works when typed in chat

Check commands folder:

    ls ~/.claude/commands/

Check skill was created:

    find "$APPDATA/Claude/local-agent-mode-sessions/skills-plugin" -name "SKILL.md"

---

## Part 4 — Backup to GitHub

To save commands to a GitHub repo (assuming ~/.claude is a git repository):

    cd ~/.claude
    git add commands/check-code.md commands/optimize-code.md
    git commit -m "add C# development commands"
    git push origin main

Important: settings.local.json must NOT be committed — it may contain API tokens.

---

## File Structure Summary

    ~/.claude/
    └── commands/
        ├── check-code.md          # /check-code slash command
        └── optimize-code.md       # /optimize-code slash command

    %APPDATA%\Claude\local-agent-mode-sessions\skills-plugin\
    └── <plugin-uuid>\
        └── <install-uuid>\
            └── skills\
                └── csharp-standards\
                    └── SKILL.md   # auto-triggered C# standards skill
