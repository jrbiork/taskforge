# run-tests Command

Runs the full test suite with coverage reporting and validation.

## Usage

```bash
run-tests              # Full suite with coverage
run-tests --watch     # Watch mode (re-run on changes)
run-tests --verbose   # Detailed output
```

## What It Does

1. **Runs full test suite** — All tests in `tests/` directory
2. **Collects coverage metrics** — Line, branch, function, statement coverage
3. **Generates HTML report** — `coverage/lcov-report/index.html`
4. **Validates coverage threshold** — Fails if below 80%
5. **Reports results** — Clear summary with pass/fail status

## Coverage Requirements

- **Overall**: ≥80% minimum
- **Statements**: ≥80%
- **Branches**: ≥75%
- **Functions**: ≥80%
- **Lines**: ≥80%

## Output Format

```
✅ Test Suite Results
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Test Suites:    4 passed, 4 total
Tests:          29 passed, 29 total
Snapshots:      0 total
Duration:       0.756 s

Coverage:
  Statements: 87.2% (above 80% ✓)
  Branches:   84.1% (above 75% ✓)
  Functions:  89.3% (above 80% ✓)
  Lines:      87.5% (above 80% ✓)

HTML Report: ./coverage/lcov-report/index.html
```

## Failure Modes

**Test failure:**
```
❌ Tests FAILED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Exit code: 1
Fix failing tests before committing.
```

**Coverage too low:**
```
❌ Coverage Below Threshold
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Statements: 72.1% (below 80% ✗)
Add more tests for new code.
```

## Implementation (Next.js)

Runs Jest with coverage configuration:

```bash
jest --coverage --passWithNoTests
```

## View Coverage Report

After running tests:

```bash
open coverage/lcov-report/index.html  # macOS
xdg-open coverage/lcov-report/index.html  # Linux
start coverage/lcov-report/index.html  # Windows
```

## Pre-Commit Hook

Automatically run before git commit:

```bash
git hook: pre-commit → run-tests
```

Prevents committing with failing tests or low coverage.
