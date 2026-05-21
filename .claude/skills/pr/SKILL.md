---
name: pr
description: Prepare and open a pull request — runs checks, writes description, and creates the PR
allowed-tools:
  - Bash
  - Read
---

# Pull Request Skill

Automates the PR creation workflow: pre-flight checks → branch push → PR description → open.

## Step 1 — Pre-flight Checks

```bash
# Tests must pass
npm test                          # Next.js
# or
cd fastapi && make test           # FastAPI

# No stray console.logs
grep -rn "console\.log\|console\.error\|console\.warn" nextjs/app nextjs/components nextjs/lib --include="*.ts" --include="*.tsx"

# TypeScript must compile
cd nextjs && npx tsc --noEmit

# Python linting
cd fastapi && ruff check .
```

If any check fails, fix it before continuing.

---

## Step 2 — Review the Diff

```bash
git diff main...HEAD --stat
git log main...HEAD --oneline
```

Summarise what changed:
- Which files were touched?
- What is the purpose of each commit?
- Are there any unintended changes (debug artifacts, whitespace)?

---

## Step 3 — Branch & Push

```bash
# Ensure branch name follows convention
git branch --show-current
# Should be: feature/... or fix/...

git push -u origin HEAD
```

---

## Step 4 — Write the PR Description

Use this template:

```markdown
## Summary
- <bullet: what changed and why>
- <bullet: any notable implementation decisions>

## Test plan
- [ ] All existing tests pass (`npm test` / `make test`)
- [ ] New tests cover the added behaviour
- [ ] Manually tested: <describe the path you walked>
- [ ] No `console.log` left behind
- [ ] TypeScript compiles without errors

## Screenshots (if UI change)
<paste before/after screenshots>
```

---

## Step 5 — Open the PR

```bash
gh pr create \
  --title "<50-char title>" \
  --body "$(cat <<'EOF'
## Summary
...

## Test plan
- [ ] ...
EOF
)"
```

---

## Checklist Before Requesting Review

- [ ] Branch name follows `feature/` or `fix/` convention
- [ ] All tests pass
- [ ] No `console.log` / `any` types / hardcoded secrets
- [ ] Files < 500 lines; functions < 50 lines
- [ ] Auth guards in place on new API routes
- [ ] PR description explains the **why**, not just the what
- [ ] Linked to relevant issue/ticket number
