# /analyze-build-fix — GitNexus → Build → Fix Loop

Run GitNexus analysis, build the solution, and iteratively fix any errors found.

## Steps

### 1. GitNexus Analysis

```bash
npx gitnexus analyze
```

Report: how many symbols, relationships, and any warnings about stale index.

### 2. Build the Solution

Run the appropriate build command for the current project:

**AutoBIMFusion:**
```bash
dotnet build AutoBIMFusion.slnx -c DebugA26 --no-restore
```

**RevitBIMFusion:**
```bash
dotnet build -c "Debug.R26" --no-restore -p:LaunchRevit=false -p:DeployAddin=false
```

**TelegramBot:**
```bash
dotnet build
```

If the build command is unclear, ask the user which solution/configuration to use.

### 3. Fix Errors

If the build fails:
1. Parse the error output — extract file paths and error codes
2. For each error, read the source file and apply the fix
3. Re-build after fixing all errors
4. Repeat until build succeeds (max 5 iterations — if still failing, report to user)

### 4. Detect Changes

```bash
npx gitnexus detect_changes
```

Report which symbols and execution flows were affected.

### 5. Summary

Report:
- Build result (success/fail + number of warnings)
- GitNexus change detection results
- Files modified (if any)
- Next steps (commit? review? test?)
