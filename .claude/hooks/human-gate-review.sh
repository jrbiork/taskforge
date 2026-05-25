#!/bin/bash
# Stop hook for architect-review agent.
# Enforces human gate after architect approves or rejects a design.

set -e

cat  # consume stdin

review_file=$(find .tasks/reviews -name "*-review.md" -type f -mmin -10 | head -n 1)

if [ -z "$review_file" ]; then
  echo "ERROR: No review file found in .tasks/reviews/ (created in last 10 minutes)" >&2
  echo "Create a review file in .tasks/reviews/ before completing." >&2
  exit 2
fi

echo "Found review: $review_file"

decision=$(grep -E "^Decision: (APPROVED|REJECTED)" "$review_file" 2>/dev/null | awk '{print $2}' | head -n 1)

if [ -z "$decision" ]; then
  echo "ERROR: Review file missing required 'Decision: APPROVED' or 'Decision: REJECTED' line" >&2
  echo "Add a Decision line at the top of your review file." >&2
  exit 2
fi

if [ "$decision" = "REJECTED" ]; then
  echo "❌ Architect REJECTED the design." >&2
  echo "Read the 'Required Changes' section in $review_file and revise the spec." >&2
  exit 2
fi

if [ "$decision" = "APPROVED" ]; then
  echo "✓ Architect approved the design."
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "⚠️  HUMAN GATE: Review the approval before proceeding"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
  echo "The architect has approved the design. Please review:"
  echo "  Spec:   .tasks/specs/time-tracking.md"
  echo "  Review: $review_file"
  echo ""
  echo "To proceed to implementation, run:"
  echo "  > Use the implementer-tester subagent to read .tasks/specs/time-tracking.md and implement the feature with tests"
  echo ""
  echo "To reject and revise, edit the spec and run:"
  echo "  > Use the architect-review subagent to re-review .tasks/specs/time-tracking.md"
  echo ""
  exit 0
fi

echo "ERROR: Unexpected decision value: '$decision'" >&2
exit 2
