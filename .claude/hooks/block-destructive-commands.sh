#!/bin/bash
# PreToolUse hook for implementer-tester agent (Bash tool).
# Blocks destructive shell commands before they execute.

set -e

input=$(cat)
command=$(echo "$input" | jq -r '.tool_input.command // empty' 2>/dev/null)

if [ -z "$command" ]; then
  exit 0
fi

destructive_patterns=(
  "rm -rf"
  "git push --force"
  "git push -f"
  "npm publish"
  "docker push"
  "DROP TABLE"
  "DROP DATABASE"
  "TRUNCATE"
  "curl.*| bash"
  "wget.*| bash"
)

for pattern in "${destructive_patterns[@]}"; do
  if echo "$command" | grep -qi "$pattern"; then
    echo "Blocked: '$pattern' pattern detected in command" >&2
    echo "Command: $command" >&2
    echo "Destructive operations are not allowed in the implementer-tester agent." >&2
    exit 2
  fi
done

exit 0
