---
name: onboard
description: Help new developers get started with TaskForge team practices, tooling, and workflows
allowed-tools:
  - Bash
  - Read
---

# Developer Onboarding Skill

Walk a new team member through environment setup, codebase orientation, and team practices.

## Step 1 — Prerequisites

Verify the required toolchain is installed:

```bash
node --version        # Need v20+
python3 --version     # Need 3.12+
git --version
```

If anything is missing, direct to:
- Node: https://nodejs.org (use `nvm` for version management)
- Python: https://python.org or `pyenv`

---

## Step 2 — Clone & Configure

```bash
git clone <repo-url>
cd claude-code-tutorials-apps
```

### Next.js setup

```bash
cd nextjs
npm install
cp .env.example .env
# Edit .env — set DATABASE_URL and generate a secret:
openssl rand -base64 32   # paste output as NEXTAUTH_SECRET
npm run db:push
npm run seed
npm run dev               # → http://localhost:3000
```

### FastAPI setup

```bash
cd fastapi
pip install -e ".[dev]"
cp .env.example .env
# Edit .env — paste a generated SECRET_KEY:
openssl rand -base64 32
make migrate
make seed
make run                  # → http://localhost:8000/docs
```

---

## Step 3 — Run the Test Suite

Confirm everything works before touching code:

```bash
# Next.js
cd nextjs && npm test

# FastAPI
cd fastapi && make test
```

All tests should pass. If anything fails, check `.env` values first.

---

## Step 4 — Codebase Orientation

Key files to read in order:

| File | Why |
|---|---|
| `CLAUDE.md` | Project conventions, commands, architecture summary |
| `ARCHITECTURE.md` | Component diagrams and data flow for both tracks |
| `nextjs/prisma/schema.prisma` | Canonical data model |
| `nextjs/lib/types.ts` | TypeScript types derived from Prisma |
| `fastapi/app/models/` | SQLAlchemy ORM — mirrors Prisma schema |

---

## Step 5 — Team Practices

### Git Workflow

- **Never push to `main` directly** — always use feature branches
- Branch naming: `feature/short-description` or `fix/issue-name`
- Open a PR; all tests must pass before merge
- See `.claude/rules/git-workflow.md` for the full checklist

### Code Standards

- No `console.log/error/warn` — use the project logger
- No `any` types in TypeScript — use explicit types or extend from `lib/types.ts`
- Files < 500 lines; functions < 50 lines
- Unit tests required for all new code (Jest / pytest), ≥ 99.9% coverage target

### Auth Guards

- Next.js: every API route must call `getServerSession(authOptions)` before DB access
- FastAPI: every protected endpoint must declare `Depends(get_current_user)`

### Security

- Secrets live in `.env` only — never hardcode or commit them
- `.env` is gitignored; `.env.example` has placeholder values only
- If you accidentally commit a secret, rotate it immediately

---

## Step 6 — First Task Checklist

Before writing your first PR:

- [ ] Both apps run locally and tests pass
- [ ] Read `CLAUDE.md` and `ARCHITECTURE.md`
- [ ] Understand the data model (User → Project → Task → Comment)
- [ ] Know how auth works in each track
- [ ] Create a feature branch (`feature/your-first-change`)
- [ ] Run `/review` before opening the PR

---

## Quick Reference

| Command | What it does |
|---|---|
| `npm run dev` | Start Next.js dev server |
| `npm test` | Run Jest tests |
| `npm run db:push` | Sync Prisma schema to SQLite |
| `make run` | Start FastAPI with Uvicorn |
| `make test` | Run pytest suite |
| `make migrate` | Apply Alembic migrations |
| `make seed` | Seed demo data |
