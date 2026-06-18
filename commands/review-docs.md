# /review-docs — Project Documentation Review

Analyze project documentation for completeness, consistency, and alignment with best practices. Update docs as needed.

## Steps

### 1. Discover Documentation

Find all documentation files in the project:
- `*.md` files in root, `docs/`, `Docs/`
- `AGENTS.md`, `CLAUDE.md`, `README.md`
- `ROADMAP.md`, `ARCHITECTURE.md`
- Any `*.md` in subdirectories

### 2. Read and Analyze

For each document, check:
- **Accuracy** — does the content match the current codebase?
- **Completeness** — are key areas documented?
- **Consistency** — do different docs contradict each other?
- **Freshness** — is the doc outdated (references removed files, old patterns)?

### 3. Cross-Reference with Codebase

Compare documented architecture/patterns against actual code:
- Does the documented directory structure match reality?
- Are the described public APIs still current?
- Do the build commands in docs still work?

### 4. Identify Gaps

Check for common missing documentation:
- API reference for public interfaces
- Build/test instructions
- Configuration guide
- Deployment/CI documentation
- Changelog or release notes

### 5. Present Findings

Report:
- What docs exist and their status (accurate / outdated / missing)
- Specific inconsistencies found
- Recommended updates

### 6. Update (on user confirmation)

If the user confirms, update the docs:
- Fix outdated information
- Add missing sections
- Remove references to deleted code/features
- Ensure all docs reference each other correctly

## Tips

- When updating docs, keep changes minimal and focused — don't rewrite unless asked
- Preserve the author's tone and language (the user works in both Russian and English)
- If a ROADMAP.md exists, cross-reference it with actual TODO items in the code
- After updating, run a final consistency check across all docs
