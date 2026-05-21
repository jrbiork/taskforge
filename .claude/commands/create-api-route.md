# create-api-route Command

Scaffolds a new Next.js API route following TaskForge conventions.

## Usage

```
/create-api-route <route-name>
```

**Examples:**
```
/create-api-route labels
/create-api-route members
/create-api-route task-labels
```

The route name becomes the directory name under `nextjs/app/api/` and should be
plural, kebab-case (e.g. `labels`, `task-labels`).

## What It Does

1. **Creates the collection route** — `nextjs/app/api/<name>/route.ts` with GET + POST handlers
2. **Creates the item route** — `nextjs/app/api/<name>/[id]/route.ts` with GET + PATCH + DELETE handlers
3. **Creates a test file** — `nextjs/tests/api/<name>.test.ts` covering auth guards and core operations
4. No route index file exists in this project — nothing to update

## Conventions (enforced automatically)

- Auth check via `getServerSession(authOptions)` is the first thing every handler does
- Session is cast to `AuthSession` (`Session & { user: { id: string } }`) for typed access to `session.user.id`
- Request body is validated with a Zod schema before touching Prisma
- `ZodError` → 400, missing resource → 404, everything else → 500
- Collection route returns 201 on POST; item route returns 200 on PATCH, `{ success: true }` on DELETE
- All Prisma queries go through the singleton at `@/lib/db`
- No `any` types — extend or import types from `@/lib/types` as needed
- No `console.log/error/warn`

## Implementation Instructions

When this command is invoked with `$ARGUMENTS` (the route name):

### Step 1 — Derive names

From the route name (e.g. `labels`):
- **routeName**: the argument as-is (e.g. `labels`)
- **modelName**: singular PascalCase matching the Prisma model (e.g. `Label`) — infer from the route name or ask if ambiguous
- **schemaName**: `${modelName}Schema` / `${modelName}UpdateSchema`

Check `nextjs/prisma/schema.prisma` to confirm the model exists and read its fields before generating code.

### Step 2 — Create `nextjs/app/api/<routeName>/route.ts`

Use this exact structure (adapt fields from the real Prisma model):

```typescript
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";
import { Session } from "next-auth";

type AuthSession = Session & { user: { id: string } };

const <modelName>Schema = z.object({
  // required fields: z.string().min(1), z.number(), etc.
  // optional fields: .optional()
});

export async function GET(req: Request) {
  try {
    const session = (await getServerSession(authOptions)) as AuthSession | null;
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    // add relevant filter params here

    const items = await prisma.<modelName (camelCase)>.findMany({
      where: { /* filters */ },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(items);
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = (await getServerSession(authOptions)) as AuthSession | null;
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const data = <modelName>Schema.parse(body);

    const item = await prisma.<modelName (camelCase)>.create({ data });

    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
```

### Step 3 — Create `nextjs/app/api/<routeName>/[id]/route.ts`

```typescript
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";
import { Session } from "next-auth";

type AuthSession = Session & { user: { id: string } };

const <modelName>UpdateSchema = z.object({
  // all fields optional for partial update
});

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = (await getServerSession(authOptions)) as AuthSession | null;
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const item = await prisma.<modelName (camelCase)>.findUnique({ where: { id } });

    if (!item) {
      return NextResponse.json({ error: "<ModelName> not found" }, { status: 404 });
    }

    return NextResponse.json(item);
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = (await getServerSession(authOptions)) as AuthSession | null;
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const data = <modelName>UpdateSchema.parse(body);

    const existing = await prisma.<modelName (camelCase)>.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "<ModelName> not found" }, { status: 404 });
    }

    const updated = await prisma.<modelName (camelCase)>.update({ where: { id }, data });

    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = (await getServerSession(authOptions)) as AuthSession | null;
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const existing = await prisma.<modelName (camelCase)>.findUnique({ where: { id } });

    if (!existing) {
      return NextResponse.json({ error: "<ModelName> not found" }, { status: 404 });
    }

    await prisma.<modelName (camelCase)>.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
```

### Step 4 — Create `nextjs/tests/api/<routeName>.test.ts`

Mirror the pattern in `nextjs/tests/lib/notifications.test.ts`:
- Mock `@/lib/db` at the top with `jest.mock`
- Mock `next-auth` to control `getServerSession` return value
- Test each handler for: unauthenticated (401), valid input (success), invalid input (400/404)
- Keep mocks typed — cast with `as jest.Mock`

```typescript
jest.mock("@/lib/db", () => ({
  prisma: {
    <modelName (camelCase)>: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  },
}));

jest.mock("next-auth", () => ({
  getServerSession: jest.fn(),
}));

jest.mock("@/lib/auth", () => ({ authOptions: {} }));

import { getServerSession } from "next-auth";
import { prisma } from "@/lib/db";
import { GET, POST } from "@/app/api/<routeName>/route";
import {
  GET as GET_ONE,
  PATCH,
  DELETE as DELETE_ONE,
} from "@/app/api/<routeName>/[id]/route";

const mockSession = getServerSession as jest.Mock;
const mockFindMany = prisma.<modelName (camelCase)>.findMany as jest.Mock;
const mockFindUnique = prisma.<modelName (camelCase)>.findUnique as jest.Mock;
const mockCreate = prisma.<modelName (camelCase)>.create as jest.Mock;
const mockUpdate = prisma.<modelName (camelCase)>.update as jest.Mock;
const mockDelete = prisma.<modelName (camelCase)>.delete as jest.Mock;

const authed = { user: { id: "user1", name: "Test", email: "test@example.com" } };

function makeReq(body?: unknown, url = "http://localhost/api/<routeName>") {
  return new Request(url, {
    method: body ? "POST" : "GET",
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
}

beforeEach(() => jest.clearAllMocks());

// --- Collection route ---

describe("GET /api/<routeName>", () => {
  it("returns 401 when unauthenticated", async () => {
    mockSession.mockResolvedValue(null);
    const res = await GET(makeReq());
    expect(res.status).toBe(401);
  });

  it("returns list when authenticated", async () => {
    mockSession.mockResolvedValue(authed);
    mockFindMany.mockResolvedValue([]);
    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([]);
  });
});

describe("POST /api/<routeName>", () => {
  it("returns 401 when unauthenticated", async () => {
    mockSession.mockResolvedValue(null);
    const res = await POST(makeReq({ /* minimal valid body */ }));
    expect(res.status).toBe(401);
  });

  it("creates and returns 201", async () => {
    mockSession.mockResolvedValue(authed);
    const created = { id: "new1", /* ...fields */ };
    mockCreate.mockResolvedValue(created);
    const res = await POST(makeReq({ /* valid body */ }));
    expect(res.status).toBe(201);
    expect(await res.json()).toMatchObject(created);
  });

  it("returns 400 on invalid body", async () => {
    mockSession.mockResolvedValue(authed);
    const res = await POST(makeReq({}));
    expect(res.status).toBe(400);
  });
});

// --- Item route ---

describe("GET /api/<routeName>/[id]", () => {
  it("returns 401 when unauthenticated", async () => {
    mockSession.mockResolvedValue(null);
    const res = await GET_ONE(makeReq(), { params: Promise.resolve({ id: "1" }) });
    expect(res.status).toBe(401);
  });

  it("returns 404 when not found", async () => {
    mockSession.mockResolvedValue(authed);
    mockFindUnique.mockResolvedValue(null);
    const res = await GET_ONE(makeReq(), { params: Promise.resolve({ id: "1" }) });
    expect(res.status).toBe(404);
  });

  it("returns item when found", async () => {
    mockSession.mockResolvedValue(authed);
    const item = { id: "1" };
    mockFindUnique.mockResolvedValue(item);
    const res = await GET_ONE(makeReq(), { params: Promise.resolve({ id: "1" }) });
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject(item);
  });
});

describe("PATCH /api/<routeName>/[id]", () => {
  it("returns 404 when item missing", async () => {
    mockSession.mockResolvedValue(authed);
    mockFindUnique.mockResolvedValue(null);
    const req = new Request("http://localhost", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ /* valid partial */ }),
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: "1" }) });
    expect(res.status).toBe(404);
  });
});

describe("DELETE /api/<routeName>/[id]", () => {
  it("returns 404 when item missing", async () => {
    mockSession.mockResolvedValue(authed);
    mockFindUnique.mockResolvedValue(null);
    const res = await DELETE_ONE(makeReq(), { params: Promise.resolve({ id: "1" }) });
    expect(res.status).toBe(404);
  });

  it("returns success when deleted", async () => {
    mockSession.mockResolvedValue(authed);
    mockFindUnique.mockResolvedValue({ id: "1" });
    mockDelete.mockResolvedValue({});
    const res = await DELETE_ONE(makeReq(), { params: Promise.resolve({ id: "1" }) });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true });
  });
});
```

### Step 5 — Report what was created

After generating the files, print a summary:

```
Created:
  nextjs/app/api/<routeName>/route.ts         (GET, POST)
  nextjs/app/api/<routeName>/[id]/route.ts    (GET, PATCH, DELETE)
  nextjs/tests/api/<routeName>.test.ts        (auth + CRUD coverage)

Next steps:
  - Fill in the Zod schema fields to match your Prisma model
  - Fill in the POST body in the test file with a valid minimal payload
  - Run: cd nextjs && npm test
```

Do **not** run tests automatically — leave that to the developer.
