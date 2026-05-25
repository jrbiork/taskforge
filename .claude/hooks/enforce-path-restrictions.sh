#!/bin/bash
# PreToolUse hook for implementer-tester agent (Edit and Write tools).
# Restricts file writes to allowed paths within the nextjs/ directory.

set -e

input=$(cat)
file_path=$(echo "$input" | jq -r '.tool_input.file_path // empty' 2>/dev/null)

if [ -z "$file_path" ]; then
  exit 0
fi

# Block sensitive paths regardless of anything else
blocked_patterns=(
  ".env"
  ".env.*"
  "secrets"
  ".claude"
  "fastapi"
)

for pattern in "${blocked_patterns[@]}"; do
  if echo "$file_path" | grep -q "$pattern"; then
    echo "Blocked: '$file_path' matches blocked pattern '$pattern'" >&2
    exit 2
  fi
done

# Allowed path prefixes
allowed_prefixes=(
  "nextjs/components/"
  "nextjs/app/api/"
  "nextjs/lib/"
  "nextjs/tests/"
  "nextjs/prisma/"
)

for prefix in "${allowed_prefixes[@]}"; do
  if [[ "$file_path" == "$prefix"* ]]; then
    exit 0
  fi
done

echo "Permission denied: '$file_path' is not in an allowed path" >&2
echo "Allowed paths: nextjs/components/, nextjs/app/api/, nextjs/lib/, nextjs/tests/, nextjs/prisma/" >&2
exit 2
