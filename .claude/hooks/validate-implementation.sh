#!/bin/bash
# Stop hook for implementer-tester agent.
# Runs lint and tests to validate the implementation before allowing completion.

set -e

cat  # consume stdin

echo "Validating implementation..."

NEXTJS_DIR="nextjs"

if [ ! -d "$NEXTJS_DIR" ]; then
  echo "ERROR: nextjs/ directory not found. Run from project root." >&2
  exit 2
fi

echo "Running lint..."
if ! (cd "$NEXTJS_DIR" && npm run lint 2>&1); then
  echo "ERROR: Lint failed. Fix all linting errors before completing." >&2
  exit 2
fi
echo "✓ Lint passed"

echo "Running tests..."
if ! (cd "$NEXTJS_DIR" && npm test -- --passWithNoTests 2>&1); then
  echo "ERROR: Tests failed. All tests must pass before implementation is complete." >&2
  exit 2
fi
echo "✓ Tests passed"

echo "✓ Implementation validation passed"
exit 0
