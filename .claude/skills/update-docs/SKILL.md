---
name: update-docs
description: >
  Analyzes recent Git changes, identifies stale documentation, updates README,
  API docs (docs/api-reference.md), and CHANGELOG.md, then reports a summary
  of every doc touched. Use when user says "update docs", "update documentation",
  "sync docs", "/update-docs", or after a significant feature lands.
allowed-tools:
  - Bash
  - Read
  - Edit
  - Write
---

# Update Docs Skill

Keeps TaskForge documentation in sync with the actual codebase after code changes.

## Docs Inventory

| File | Purpose | Update trigger |
|------|---------|----------------|
| `README.md` | Quick-start, feature list, API summary, data model, config | New endpoints, env vars, data model changes, feature additions |
| `docs/api-reference.md` | Full API reference (request/response shapes, auth, examples) | Any router/schema/service change |
| `CHANGELOG.md` | Versioned history of user-facing changes | Every merge-worthy set of changes |
| `ARCHITECTURE.md` | Component diagrams and data flow | Structural changes (new layers, services, auth strategy) |
| `CLAUDE.md` | Dev commands, conventions, project context | New commands, stack changes, convention changes |

---

## Step 1 — Analyze Git Changes

Run these commands to understand what changed:

```bash
# Uncommitted changes (working tree vs HEAD)
git diff --stat HEAD

# Recent commits not yet reflected in docs (last 20)
git log --oneline -20

# Full diff of changed files (for content analysis)
git diff HEAD
```

If the user specifies a range (e.g., "since last release", "last 5 commits"), use:
```bash
git log --oneline <ref>..HEAD
git diff <ref>..HEAD
```

---

## Step 2 — Identify What Needs Updating

Scan the diff output and categorize changes using this decision table:

| Changed file pattern | Docs to update |
|----------------------|----------------|
| `nextjs/app/api/**` or `fastapi/app/routers/**` | README (API Endpoints section), docs/api-reference.md |
| `nextjs/prisma/schema.prisma` or `fastapi/app/models/**` | README (Data Model section), docs/api-reference.md (schemas) |
| `fastapi/app/schemas/**` or `nextjs/lib/types.ts` | docs/api-reference.md (request/response bodies) |
| `nextjs/.env.example` or `fastapi/.env.example` | README (Configuration section), CLAUDE.md (env vars table) |
| `nextjs/app/**` or `nextjs/components/**` (UI) | README (Features section) |
| `fastapi/app/services/**` | docs/api-reference.md (behavior notes) |
| `ARCHITECTURE.md` (if missing new components) | ARCHITECTURE.md |
| Any user-facing behavior change | CHANGELOG.md (always) |

Build a list: `docs_to_update = [...]`. If nothing doc-worthy changed, say so and stop.

---

## Step 3 — Update Each Doc

### README.md

Read the current file first. Then make targeted edits — do NOT rewrite sections that are still accurate.

**API Endpoints section** — match the format already used:
```
### <Resource>
| Method | Path | Description | Auth |
|--------|------|-------------|------|
| POST   | /api/... | ... | Required |
```

**Data Model section** — keep the ASCII table style already in the file.

**Features section** — bullet list, add new features, remove removed ones.

**Configuration / env vars** — keep the existing table format, add/remove rows only.

### docs/api-reference.md

Read existing structure (it uses `## <Resource>` → `### <Method> <Path>` → request/response blocks).

For each changed endpoint:
1. Find the matching section (or create one if new)
2. Update: description, path params, query params, request body schema, response schema, example payloads
3. Keep TypeScript-style type annotations for Next.js and Python annotations for FastAPI

For new endpoints, follow this template:
```markdown
### POST /api/<resource>

**Auth required:** Yes

**Request body:**
\`\`\`typescript
{
  field: type  // description
}
\`\`\`

**Response (201):**
\`\`\`typescript
{
  id: string
  // ...
}
\`\`\`

**Errors:** 400 Bad Request, 401 Unauthorized, 404 Not Found
```

### CHANGELOG.md

If the file does not exist, create it with this header:
```markdown
# Changelog

All notable changes to TaskForge are documented here.
Format: [Keep a Changelog](https://keepachangelog.com/en/1.0.0/)

```

Prepend a new entry at the top (below the header):
```markdown
## [Unreleased] — <YYYY-MM-DD>

### Added
- <new feature bullet>

### Changed
- <changed behavior bullet>

### Fixed
- <bug fix bullet>

### Removed
- <removed feature bullet>
```

Rules:
- Omit empty sections (don't write `### Added` if nothing was added)
- Write from the user's perspective ("Tasks can now be assigned…"), not the implementer's ("Added `assigneeId` field…")
- Use today's date: run `date +%Y-%m-%d` to get it

---

## Step 4 — Report What Changed

After all edits are done, print a concise report:

```
## Docs Update Report

**Changes analyzed:** <N commits / working tree changes>
**Files examined:** <list of code files that drove updates>

### Docs updated:
- README.md — <what section(s) and why>
- docs/api-reference.md — <what endpoint(s) and why>
- CHANGELOG.md — <new entry summary>

### Docs skipped (no relevant changes):
- ARCHITECTURE.md — no structural changes detected
```

If a doc was NOT updated because the change is ambiguous, flag it:
```
### Needs human review:
- ARCHITECTURE.md — new `notification-bell` component may warrant a diagram update
```

---

## Guardrails

- **Never delete existing accurate content** — only add, update, or remove stale parts
- **Never update CLAUDE.md** from this skill — that file has special ownership (human-maintained)
- **Never update ARCHITECTURE.md** from this skill unless the change is unambiguous (e.g., a new top-level service file was added) — flag it for review instead
- **Preserve existing formatting** — match heading levels, table style, and code block language tags already used in each file
- **One pass, atomic** — read each file once, make all needed edits, then move on. Do not re-read to verify.
- **Stop early if clean** — if git diff is empty or only touches tests/config, report "No documentation updates needed" and exit
