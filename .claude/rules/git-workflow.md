# Git Workflow Rules

## Branch Management

- **Never commit directly to main branch** — All changes must go through feature branches and PRs
- **Create descriptive feature branches** — Use format: `feature/short-description` or `fix/issue-name`
  - Examples: `feature/notification-system`, `fix/task-assignment-bug`, `docs/api-reference`
  - Avoid: `fix`, `update`, `work`, `temp`, `wip`

## Pre-Commit Checklist

- **Run tests before committing** — All tests must pass
  ```bash
  npm test
  ```
- **Check test coverage** — Aim for ≥99.9% coverage on new code
- **Lint and format** — No linting errors (enforced by CI)
- **Type check** — TypeScript must compile without errors

## Commit Messages

- **Write meaningful commit messages** — Explain the WHY, not just WHAT
  - ✅ Good: `Add notification system for task assignments`
  - ✅ Good: `Fix race condition in comment creation`
  - ❌ Bad: `fix`, `update`, `changes`, `work in progress`
- **Format**: One-line summary (≤50 chars), then blank line, then detailed explanation
- **Reference issues**: Include issue/PR numbers when applicable
  - Example: `Fix #123: Handle null assignee in task notifications`

## Pull Request Process

1. Create feature branch from `main`
2. Make changes (commit early and often)
3. Push branch and open PR with description
4. All tests must pass before merge
5. Code review required
6. Squash or rebase before merging (keep history clean)
7. Delete branch after merge

## CI/CD Integration

- Tests run automatically on all PRs
- Coverage reports show impact of changes
- Blocked merge if tests fail or coverage drops below 80%
- No force-pushes to main
