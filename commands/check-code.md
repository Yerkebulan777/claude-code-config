# /check-code — C# Code Review

Perform a strict code review of the current or selected C# code against the project's development standards.

## What to check

### 1. Resource Management (IDisposable)
Find **all** objects implementing `IDisposable`:
- DB connections: `SqlConnection`, `DbContext`, `OracleConnection`
- Transactions: `DbTransaction`, `SqlTransaction`, any `ITransaction`
- Streams: `Stream`, `StreamReader`, `StreamWriter`, `BinaryReader`, `BinaryWriter`
- HTTP: `HttpClient`, `HttpResponseMessage`
- Any Revit API object implementing `IDisposable`

Verify each is wrapped in `using`. Exception: objects whose lifecycle is intentionally managed externally (DI container).

### 2. Error Handling
- `try/catch` must appear only at genuinely dangerous locations: IO, external API, network, DB transactions.
- `catch (Exception)` without a type filter is always a violation — catch a specific type.
- `catch` block with no logging or handling is a violation ("swallowed exception").
- Log messages inside `try` must be concise: operation name + key parameters only.

### 3. Code Cleanliness
- Wrapper classes that only delegate calls to another class without adding logic — DRY/SRP violation.
- Redundant null checks: if an object is guaranteed non-null by DI or a prior guard clause, the check is noise.
- Duplicate code (3+ similar blocks) must be extracted into a utility method or static class.
- `StringBuilder` is required for logging inside loops. String concatenation in a loop is a violation.

### 4. Additional (flag if noticed)
- `async void` instead of `async Task` — violation.
- Comments that describe *what* instead of *why* — remove them.
- Unused `using` directives — flag for cleanup.

## Output format

Start with a one-sentence overall assessment of the code quality.

Then list each violation:

**[N]. [Category] — [Short description]**
- Location: `ClassName.MethodName`, line ~N
- Problem: what exactly is wrong
- Fix: show the corrected version (brief code snippet)

If no violations found — state this explicitly and confirm the code meets the standards.

End with a summary: total violation count, which are **critical** (memory leaks, hidden errors) vs **non-critical** (style, readability).
