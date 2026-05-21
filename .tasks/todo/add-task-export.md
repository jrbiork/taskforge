# ADD TASK EXPORT

## Overview
Add CSV export for tasks in the task board view.

## Why
Users need a way to export task data for reporting and offline use.

## Acceptance Criteria
- [ ] Export utility converts TaskForBoard[] to a downloadable CSV
- [ ] Empty task list shows user-facing message instead of downloading empty file
- [ ] Export button visible in TaskBoard, right-aligned in the filter bar
- [ ] Tests cover export logic at ≥99.9% coverage
- [ ] Documentation updated

## Notes
- No new npm dependencies; use browser Blob API
- CSV columns: Title, Description, Status, Priority, Assignee, Created At
- Filtered task list (not raw project tasks) is exported

## Plan
1. Create lib/export.ts utility
2. Add Export CSV button to task-board.tsx
3. Add tests/lib/export.test.ts
4. Update CHANGELOG.md

## Progress Log
