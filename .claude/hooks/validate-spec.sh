#!/bin/bash
# Stop hook for pm-spec agent.
# Validates that a complete spec was written to .tasks/specs/

set -e

cat  # consume stdin

echo "Validating spec output..."

spec_file=$(find .tasks/specs -name "*.md" -type f -mmin -5 | head -n 1)

if [ -z "$spec_file" ]; then
  echo "ERROR: No spec file found in .tasks/specs/ (created in last 5 minutes)" >&2
  echo "Create a spec file in .tasks/specs/ before completing." >&2
  exit 2
fi

echo "Found spec: $spec_file"

required_sections=("## Overview" "## User Stories" "## Acceptance Criteria" "## Technical Notes" "## Out of Scope")

for section in "${required_sections[@]}"; do
  if ! grep -q "$section" "$spec_file"; then
    echo "ERROR: Missing required section: $section" >&2
    echo "The spec must include all five required sections." >&2
    exit 2
  fi
done

criteria_content=$(sed -n '/## Acceptance Criteria/,/^## /p' "$spec_file" | tail -n +2 | sed '$d')
word_count=$(echo "$criteria_content" | wc -w | tr -d ' ')

if [ -z "$criteria_content" ] || [ "$word_count" -lt 10 ]; then
  echo "ERROR: Acceptance Criteria section is empty or too short ($word_count words)" >&2
  echo "Provide at least 5 specific, testable acceptance criteria." >&2
  exit 2
fi

echo "✓ All required sections present"
echo "✓ Acceptance Criteria has substantive content ($word_count words)"
echo "✓ Spec validation passed"
exit 0
