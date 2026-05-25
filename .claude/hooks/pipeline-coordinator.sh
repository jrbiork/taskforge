#!/bin/bash
# Stop hook for pm-spec, architect-review, and implementer-tester agents.
# Advances the pipeline queue to the next stage after each agent completes.

set -e

cat  # consume stdin

QUEUE_FILE=".tasks/pipeline-queue.json"

if [ ! -f "$QUEUE_FILE" ]; then
  exit 0
fi

if ! command -v jq &>/dev/null; then
  echo "Warning: jq not found, skipping pipeline coordination" >&2
  exit 0
fi

current_agent=$(jq -r '.stages[] | select(.status == "in-progress") | .agent' "$QUEUE_FILE" 2>/dev/null | head -n 1)

if [ -z "$current_agent" ]; then
  echo "No in-progress stage found in pipeline queue"
  exit 0
fi

echo "Pipeline stage completed: $current_agent"

jq --arg agent "$current_agent" --arg ts "$(date -u +%Y-%m-%dT%H:%M:%SZ)" '
  (.stages[] | select(.agent == $agent) | .status) = "completed" |
  .history += [{"stage": $agent, "completed_at": $ts}]
' "$QUEUE_FILE" > "$QUEUE_FILE.tmp" && mv "$QUEUE_FILE.tmp" "$QUEUE_FILE"

next_name=$(jq -r '.stages[] | select(.status == "pending") | .name' "$QUEUE_FILE" | head -n 1)

if [ -z "$next_name" ]; then
  jq '.current_stage = "complete"' "$QUEUE_FILE" > "$QUEUE_FILE.tmp" && mv "$QUEUE_FILE.tmp" "$QUEUE_FILE"
  echo ""
  echo "✅ Pipeline complete! All stages finished."
  exit 0
fi

jq --arg stage "$next_name" '
  (.stages[] | select(.name == $stage) | .status) = "in-progress" |
  .current_stage = $stage
' "$QUEUE_FILE" > "$QUEUE_FILE.tmp" && mv "$QUEUE_FILE.tmp" "$QUEUE_FILE"

next_agent=$(jq -r --arg s "$next_name" '.stages[] | select(.name == $s) | .agent' "$QUEUE_FILE")
next_input=$(jq -r --arg s "$next_name" '.stages[] | select(.name == $s) | .input' "$QUEUE_FILE")

echo ""
echo "▶ Next stage:  $next_name"
echo "▶ Agent:       $next_agent"
echo "▶ Input:       $next_input"
echo ""
echo "Run: Use the $next_agent subagent to read $next_input and proceed"
echo ""
exit 0
