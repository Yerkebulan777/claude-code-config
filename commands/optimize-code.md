# /optimize-code — C# Codebase Optimizer

Refactor and optimize the current or selected C# code.
Goal: less code, better readability, lower memory usage — without changing observable behavior.

## Phase 1 — Find candidates (do this first)

Scan the code and compile a numbered list of issues found across all categories below.
For each item state: category, location (`ClassName.MethodName`), one-sentence problem description.

Present the list to the user and ask: **"Which of these would you like me to apply?"**
Do NOT make any changes yet. Wait for confirmation before proceeding to Phase 2.

---

## What to look for

### 1. Algorithm Simplification
Simplify implementation **without changing functionality** — inputs, outputs, and edge case behavior must remain identical:
- Nested loops replaceable with LINQ or Dictionary without behavior loss.
- `if/else if` chains replaceable with `switch expression` or Dictionary lookup.
- Recursion without memoization where iteration gives the same result with a smaller stack.
- Single-use intermediate variables that only obscure readability.

If simplification would change edge case behavior (ordering, exceptions, boundary conditions) — flag it, do NOT apply.

### 2. Dead Code — Deletion Test
For each suspect, apply the **deletion test**: imagine deleting it entirely.
- If complexity *disappears* → it was a pointless pass-through. Mark for deletion.
- If complexity *reappears across callers* → it was earning its keep. Leave it.

Look for:
- `private` methods with no call sites.
- Fields and properties declared but never read.
- Commented-out old code (`// old version`, `// TODO: delete`).
- Stale comments describing behavior that no longer exists.
- Unused `using` directives.

### 3. Duplication Elimination
Find code blocks repeated 2+ times:
- Identical logic in different methods → extract to `private static` helper or `static` utility class.
- Repeated guard conditions → generalize.
- Show exactly: what is duplicated, where, and provide the consolidated version.

### 4. Shallow Wrappers & Feature Envy
- **Shallow wrapper**: a class whose interface is nearly as complex as its implementation — it adds no real abstraction. Candidate for removal or merging into the caller.
- **Feature envy**: a method that uses more data from *another* class than from its own. The logic likely belongs in that other class — propose moving it there.

### 5. Primitive Obsession
- `string`, `int`, `bool` parameters used as identifiers, states, or domain values where a typed enum or value object would eliminate invalid states and make intent explicit.
- Example: `bool isActive, bool isVisible, bool isEnabled` → a `Status` enum or flags enum.

### 6. Memory & Performance
- String concatenation in a loop → `StringBuilder`.
- `List<T>.Contains()` in a loop → `HashSet<T>`.
- Value computed multiple times in a method → cache in local variable.
- `ToList()` where `IEnumerable<T>` suffices → remove unnecessary allocation.
- `IDisposable` objects without `using` → add it.
- Large objects in fields needed only within a single method → move to local variables.

---

## Phase 2 — Apply confirmed changes

After the user confirms which items to apply:

1. Start with a brief description **in Russian**: what you are changing and why, per confirmed item.
2. Provide the **complete optimized code** — full file or full method, not a diff.
3. For large files, output only the changed sections with line numbers.
4. For each change, explain **why** it is better (not just what changed).
5. If a category had no issues — state this explicitly.
