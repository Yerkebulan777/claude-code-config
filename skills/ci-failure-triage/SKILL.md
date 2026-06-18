---
name: ci-failure-triage
description: Use when CI checks fail on a GitHub PR and the user asks to fix them. Reads CI logs, identifies root causes, and pushes fixes. Covers Qodana, build failures, and review bot comments.
---

# CI Failure Triage

## When to Use

- User says "fix CI", "CI failed", "исправь ошибки CI", or pastes a CI failure notification
- `<ci-monitor-event>` notifications arrive with failing checks
- PR has review comments from bots (gemini-code-assist, codex, qodana, ecc-tools)

## Workflow

### Step 1 — Identify Failing Checks

```bash
gh pr checks <PR_NUMBER> --repo <OWNER>/<REPO>
```

Categorize failures:
- **Build failure** (`dotnet build` errors) — compilation issue
- **Qodana** — static analysis warnings (often non-blocking)
- **Test failure** — unit test regression
- **Lint/format** — code style violation

### Step 2 — Read CI Logs

```bash
gh run view <RUN_ID> --repo <OWNER>/<REPO> --log-failed
```

Or use `gh api` to fetch specific check run logs:
```bash
gh api repos/<OWNER>/<REPO>/actions/runs/<RUN_ID>/jobs --jq '.jobs[].steps[] | select(.conclusion=="failure") | .name'
```

For build failures, look for the exact error line in MSBuild output.

### Step 3 — Map to Source Code

1. Extract file paths and line numbers from CI error output
2. Read the relevant source files
3. If using GitNexus, run impact analysis on the affected symbols

### Step 4 — Apply Fix

Common CI failure patterns:

| Failure | Fix |
|---------|-----|
| `CS0246: type or namespace not found` | Missing `using` or project reference |
| `CS1061: does not contain a definition for` | Method renamed/removed — update caller |
| Qodana: `Auto-property accessor` | Simplify to expression-bodied member |
| Qodana: `Redundant using` | Remove unused `using` directive |
| Build: `NETSDK error` | Check `Directory.Build.props` and NuGet package versions |
| Bot review: "high priority" | Address the specific suggestion (usually correct) |

### Step 5 — Verify Locally

```bash
dotnet build <solution> -c <config> --no-restore
```

### Step 6 — Commit and Push

```bash
git add -A && git commit -m "fix: <describe the CI failure fix>" && git push
```

### Step 7 — Monitor

Wait for CI to re-run. If it passes, inform the user. If it fails again, loop back to Step 1.

## Review Bot Triage

When PR review comments arrive from bots:

| Bot | Action |
|-----|--------|
| `gemini-code-assist[bot]` | Usually correct suggestions — review and apply if valid |
| `chatgpt-codex-connector[bot]` | P0/P1/P2 severity — apply P0 and P1, evaluate P2 |
| `qodana` | Report only — fix if the issue is real, ignore false positives |
| `ecc-tools[bot]` | If "Upgrade Required" — ignore (paid feature, not actionable) |
| `github-actions[bot]` | Workflow issue — check the workflow file |

## Tips

- Always check if the failure is pre-existing or caused by your changes (`git diff` against base branch)
- Qodana warnings often don't block merge — prioritize build failures first
- When multiple CI jobs fail, fix the root cause first — cascading failures are common
- Use `gh pr checks <N> --repo <R> --watch` to monitor re-runs
