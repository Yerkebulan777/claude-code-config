# /optimize-code — C# Codebase Optimizer

Refactor and optimize the current or selected C# code. Goal: less code, better readability, lower memory usage.

## What to analyze

### 1. Algorithm Simplification
Simplify the main algorithm implementation **without changing its functionality** — the output must remain identical, only the implementation changes:
- Nested loops replaceable with LINQ or a dictionary without behavior loss.
- Recursion without memoization where iteration produces the same result with a smaller stack.
- `if/else if` chains replaceable with a dictionary or `switch expression` with the same outcome.
- Single-use intermediate variables that only obscure readability.

If a simplification would change behavior (ordering, edge cases, exceptions) — do NOT apply it; flag it explicitly instead.

### 2. Dead Code Removal
Find and mark for deletion:
- `private` methods with no call sites.
- Fields and properties that are declared but never read.
- Commented-out old code (`// old version`, `// TODO: delete`).
- Stale comments describing behavior that no longer exists in the code.
- Unused `using` directives.

### 3. Duplication Elimination
Find code blocks repeated 2+ times:
- Identical logic in different methods → extract to a `private static` helper or `static` utility class.
- Repeated guard conditions → generalize.
- Similar classes with the same structure → consider a generic or base class.

Show exactly what is duplicated, where, and provide the consolidated version.

### 4. Memory & Performance Optimization
- String concatenation in a loop → `StringBuilder`.
- `List<T>.Contains()` in a loop → `HashSet<T>`.
- Value computed multiple times → cache in a local variable.
- `ToList()` where `IEnumerable<T>` is sufficient → remove unnecessary allocation.
- `IDisposable` objects without `using` → add it.
- Large objects in fields needed only within a single method → move to local variables.

## Output format

**Start with a brief description in Russian:** what exactly you are going to change and why, organized by the sections above.

Then provide the **complete optimized code** — not a patch or diff, but the full ready-to-use file or method. For large files, output only the changed sections with line numbers.

For each change, briefly explain **why** it improves the code (not what changed, but why it is better).

If a section does not apply to the current code — state this explicitly.
