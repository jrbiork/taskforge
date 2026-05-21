---
name: review
description: Prepare a PR for review — check for common issues and generate a review-ready summary
allowed-tools:
  - Bash
  - Read
---

# PR Review Preparation Skill

Checks the current branch for common issues and produces a structured review summary.

## Automated Checks

Run these in sequence and report any findings:

### 1. Leftover debug output

```bash
grep -rn "console\.log\|console\.error\|console\.warn" \
  nextjs/app nextjs/components nextjs/lib \
  --include="*.ts" --include="*.tsx"
```

### 2. TypeScript `any` types

```bash
grep -rn ": any\b\|<any>" \
  nextjs/app nextjs/components nextjs/lib \
  --include="*.ts" --include="*.tsx"
```

### 3. Type compilation

```bash
cd nextjs && npx tsc --noEmit 2>&1
```

### 4. Python linting

```bash
cd fastapi && ruff check . 2>&1
```

### 5. Missing auth guards (FastAPI)

```bash
grep -n "^@router\." fastapi/app/routers/*.py | \
  grep -v "login\|register\|health" | head -20
# Then verify each endpoint has Depends(get_current_user)
```

### 6. Hardcoded secrets

```bash
grep -rn "password\s*=\s*['\"].\|secret\s*=\s*['\"].\|api_key\s*=\s*['\"]." \
  nextjs/ fastapi/ \
  --include="*.ts" --include="*.tsx" --include="*.py" \
  --exclude-dir=node_modules --exclude-dir=__pycache__
```

### 7. File and function size

```bash
# Files over 500 lines
find nextjs/app nextjs/components nextjs/lib fastapi/app \
  \( -name "*.ts" -o -name "*.tsx" -o -name "*.py" \) \
  -exec wc -l {} + | sort -rn | head -20
```

### 8. Test coverage

```bash
cd nextjs && npm test -- --coverage --coverageReporters=text 2>&1 | tail -20
# or
cd fastapi && make test-cov 2>&1 | tail -20
```

---

## Diff Review

```bash
git diff main...HEAD --stat
git log main...HEAD --oneline
```

Read each changed file and flag:
- Logic that could panic / throw unhandled
- DB queries without pagination on list endpoints
- Missing Zod validation on Next.js request bodies
- Missing Pydantic schemas on FastAPI request bodies
- New routes without auth guards
- SQL string interpolation (should use ORM / parameterized queries)

---

## Review Summary Template

Generate and output this summary so it can be pasted into the PR or shared with a reviewer:

```
## Review Summary — <branch-name>

### Automated Checks
- [ ] No console.log — PASS / FAIL (N occurrences)
- [ ] No `any` types — PASS / FAIL (N occurrences)
- [ ] TypeScript compiles — PASS / FAIL
- [ ] Ruff lint — PASS / FAIL
- [ ] No hardcoded secrets — PASS / FAIL
- [ ] Auth guards present — PASS / FAIL / N/A

### Files Changed
<list from git diff --stat>

### Concerns (if any)
<numbered list of issues found>

### Verdict
READY FOR REVIEW / NEEDS FIXES FIRST
```

---

## Common Issues Reference

| Issue | Where to fix |
|---|---|
| `console.log` left in | Remove or replace with project logger |
| `: any` type | Find correct type in `lib/types.ts` or extend Prisma types |
| Missing `getServerSession` | Add to top of every Next.js route handler |
| Missing `Depends(get_current_user)` | Add to FastAPI endpoint signature |
| Hardcoded secret | Move to `.env`, reference via `process.env` / `os.environ` |
| File > 500 lines | Extract to separate module |
| Function > 50 lines | Break into smaller helpers |
| No test for new code | Add Jest / pytest test, target ≥ 99.9% coverage |
