import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";
import { Session } from "next-auth";

type AuthSession = Session & { user: { id: string } };

const sprintSchema = z.object({
  name: z.string().min(1).max(100),
  startDate: z.string().min(1),
  endDate: z.string().min(1),
  goal: z.string().max(500).optional(),
});

export async function GET() {
  try {
    const session = (await getServerSession(authOptions)) as AuthSession | null;
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const sprints = await prisma.sprint.findMany({
      orderBy: { order: "asc" },
      include: { _count: { select: { tasks: true } } },
    });

    const mapped = sprints.map(({ _count, ...sprint }) => ({
      ...sprint,
      taskCount: _count.tasks,
    }));

    return NextResponse.json({ sprints: mapped });
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: detail }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = (await getServerSession(authOptions)) as AuthSession | null;
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Validation failed", details: ["Invalid JSON body"] }, { status: 400 });
    }

    const result = sprintSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ error: "Validation failed", details: result.error.flatten().fieldErrors }, { status: 400 });
    }

    const order = (await prisma.sprint.count()) + 1;
    const sprint = await prisma.sprint.create({
      data: { ...result.data, order },
    });
    return NextResponse.json({ sprint: { ...sprint, taskCount: 0 } }, { status: 201 });
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: detail }, { status: 500 });
  }
}
