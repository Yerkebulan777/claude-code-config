# C# Development Standards — Universal AI Agent Setup Guide

This guide shows how to apply the same C# coding standards to any AI coding agent.
The rules are tool-agnostic. Only the setup method differs per tool.

---

## The Rules (copy this block into any AI agent)

Paste the following as a system prompt, custom instruction, or rules file depending on your tool.

---

### SYSTEM PROMPT / RULES CONTENT

```
You are a C# development expert. Always follow these rules when writing or editing C# code.

---

RULE 1 — SIMPLICITY & DRY

- Extract repeated logic into static utility classes.
- Separate business logic and math from DB, file, and API operations (SRP).
- Call utility methods directly — never create wrapper classes that add no logic.
- If 3+ methods look similar, extract a shared helper. 1 similar line is not a reason.

---

RULE 2 — STABILITY & MEMORY MANAGEMENT

Always wrap IDisposable objects in using blocks. This includes:
  - DB connections: SqlConnection, DbContext, OracleConnection
  - Transactions: DbTransaction, SqlTransaction, ITransaction
  - Streams: Stream, StreamReader, StreamWriter, BinaryReader, BinaryWriter
  - HTTP: HttpClient, HttpResponseMessage
  - Any framework object implementing IDisposable

Example (correct):
  using var connection = new SqlConnection(connectionString);
  using var transaction = connection.BeginTransaction();

Additional:
  - Never use async void — always use async Task.
  - Prefer IEnumerable<T> over List<T> in method signatures if the collection is not modified.

---

RULE 3 — ERROR HANDLING

- Use try/catch ONLY at genuinely dangerous boundaries: IO, external API, network, DB transactions.
- Always catch specific exception types. Never use bare catch (Exception).

  Correct:
    catch (SqlException ex) when (ex.Number == 1205)
    catch (HttpRequestException ex)

- A catch block with no logging or action is a "swallowed exception" — always a bug.
- Never wrap pure math, sorting, or business logic in try/catch.
- Guard clauses take priority over try/catch:

  if (items == null || items.Count == 0) return;
  // proceed safely

- Avoid redundant null checks on objects guaranteed non-null by DI or prior guard clauses.

---

RULE 4 — LOGGING

- Inside loops, use StringBuilder for log accumulation only. Never concatenate strings in a loop.

  Bad:
    foreach (var x in list) logger.Log("item: " + x.Name);

  Good:
    var sb = new StringBuilder();
    foreach (var x in list) sb.AppendLine($"item: {x.Name}");
    logger.Log(sb.ToString());

---

RULE 5 — COMMENTS

- Comments must be short and written in Russian.
- Explain WHY the code does something — not WHAT (the code itself shows what).
- Never write comments that just restate the method name.

  Bad:  // Calculates the sum
        public double Sum(...) { }

  Good: // Revit API returns ft², converting to m²
        public double ToSquareMeters(double ft2) => ft2 * 0.0929;

---

QUICK REFERENCE

  IDisposable     → always use "using"
  Loop + logging  → always use StringBuilder
  Exceptions      → catch specific types only, never swallow
  Null checks     → only at system boundaries, not on guaranteed-non-null objects
  Wrappers        → only if they add logic; otherwise call utilities directly
```

---

## How to Apply Per Tool

### Cursor

1. Create `.cursor/rules` directory in your project root (or use the global rules file).
2. Create a file: `.cursor/rules/csharp-standards.mdc`
3. Paste the rules content above.
4. In Cursor Settings → Rules → add the file path, or use `@rules` in chat.

Alternative: create `.cursorrules` in the project root and paste the rules directly.

Reference: https://docs.cursor.com/context/rules-for-ai

---

### Windsurf (Codeium)

1. Create `.windsurfrules` in the project root.
2. Paste the rules content above into the file.
3. Windsurf loads it automatically for every session in that project.

For global rules: Settings → AI → Custom Instructions → paste the content.

Reference: https://docs.windsurf.com/windsurf/customization

---

### GitHub Copilot

1. Create `.github/copilot-instructions.md` in your repository root.
2. Paste the rules content above.
3. Copilot reads this file automatically for all suggestions in the repo.

Reference: https://docs.github.com/en/copilot/customizing-copilot/adding-custom-instructions-for-github-copilot

---

### Opencode

1. Create `AGENTS.md` in your project root.
2. Paste the rules content above.
3. Opencode reads `AGENTS.md` automatically as agent context.

---

### Claude Code

1. For project-level rules: create `CLAUDE.md` in the project root and paste the rules.
2. For global rules (all projects): paste into `~/.claude/CLAUDE.md`.
3. For an auto-triggered skill: create `SKILL.md` in the skills plugin directory
   (see the Claude-specific section below if needed).

Reference: https://docs.anthropic.com/en/docs/claude-code/memory

---

### Aider

Add to your `.aider.conf.yml`:

```yaml
system-prompt: |
  You are a C# development expert.
  [paste rules content here]
```

Or pass via CLI:
```bash
aider --system-prompt "$(cat csharp-standards.md)"
```

---

### OpenAI Codex (codex CLI)

1. For global instructions, create `~/.codex/instructions.md` and paste the rules content above.
2. For project-level instructions, create `AGENTS.md` in the project root — Codex reads it automatically.
3. Alternatively, pass via CLI flag:

```bash
codex --system-prompt "$(cat csharp-standards.md)" "your task here"
```

Or set in `~/.codex/config.toml`:

```toml
[model]
system_prompt_file = "~/.codex/instructions.md"
```

Reference: https://github.com/openai/codex

---

### Any tool with a system prompt field

If your tool has a "System Prompt", "Custom Instructions", or "AI Rules" field —
paste the rules block directly into that field. The content is plain text and works
with any LLM regardless of provider (OpenAI, Anthropic, Gemini, etc.).

---

## Slash Commands (code review & optimization)

The following two commands can be used as:
- Slash commands in Claude Code (`/check-code`, `/optimize-code`)
- Prompt templates in Cursor (`@check-code`)
- Saved prompts in any tool that supports them

### /check-code — C# Code Review

```
Review the current C# code strictly against these standards:

1. RESOURCE MANAGEMENT
   Find all IDisposable objects (SqlConnection, DbContext, Stream, HttpClient, transactions, etc.)
   Verify each is wrapped in a using block.
   Flag any missing using as a CRITICAL violation (memory leak risk).

2. ERROR HANDLING
   Flag: catch (Exception) without type filter — always a violation.
   Flag: empty catch blocks with no logging — swallowed exception.
   Flag: try/catch wrapping pure logic (math, sorting) — unnecessary.

3. CODE CLEANLINESS
   Flag: wrapper classes that only delegate calls without adding logic.
   Flag: redundant null checks on objects guaranteed non-null.
   Flag: 3+ duplicate code blocks that should be extracted to a utility.
   Flag: string concatenation inside loops — must use StringBuilder.

4. ADDITIONAL
   Flag: async void instead of async Task.
   Flag: comments describing WHAT instead of WHY.

OUTPUT FORMAT:
- One sentence overall assessment.
- Each violation: [N]. [Category] — [description] | Location | Problem | Fix (code snippet)
- Final summary: X critical (memory/errors), Y non-critical (style).
```

### /optimize-code — C# Codebase Optimizer

```
Refactor and optimize the current C# code. Goal: less code, better readability, lower memory.
Do NOT change the observable behavior — inputs and outputs must remain identical.

1. ALGORITHM SIMPLIFICATION (no behavior change allowed)
   - Replace nested loops with LINQ or Dictionary where behavior is preserved.
   - Replace if/else if chains with switch expression or Dictionary lookup.
   - Remove single-use intermediate variables that obscure reading.
   - If simplification would change edge case behavior — flag it, do not apply.

2. DEAD CODE REMOVAL
   - Private methods with no callers.
   - Fields/properties declared but never read.
   - Commented-out old code blocks.
   - Stale comments about removed behavior.
   - Unused using directives.

3. DUPLICATION ELIMINATION
   - Find blocks repeated 2+ times → extract to private static helper or static utility class.
   - Show: what is duplicated, where, and the consolidated version.

4. MEMORY & PERFORMANCE
   - String concat in loop → StringBuilder.
   - List<T>.Contains() in loop → HashSet<T>.
   - Repeated computation → cache in local variable.
   - Unnecessary ToList() → remove, keep IEnumerable<T>.
   - IDisposable without using → add using.

OUTPUT:
- Start with a brief description (in Russian) of what will change and why.
- Provide the complete optimized code — full file or full method, not a diff.
- For each change: explain WHY it is better (not just what changed).
- If a section has no issues — say so explicitly.
```

---

## Summary Table

| Tool | Rules file location | Auto-loaded? |
|---|---|---|
| Cursor | `.cursor/rules/*.mdc` or `.cursorrules` | Yes |
| Windsurf | `.windsurfrules` | Yes |
| GitHub Copilot | `.github/copilot-instructions.md` | Yes |
| Opencode | `AGENTS.md` | Yes |
| Claude Code | `CLAUDE.md` or `~/.claude/CLAUDE.md` | Yes |
| Aider | `.aider.conf.yml` → `system-prompt` | Yes |
| OpenAI Codex | `~/.codex/instructions.md` or `AGENTS.md` | Yes |
| Any other tool | System prompt / Custom instructions field | Manual paste |
