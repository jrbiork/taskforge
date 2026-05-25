import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";
import { Session } from "next-auth";

type AuthSession = Session & { user: { id: string } };

const sprintUpdateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  startDate: z.string().min(1).optional(),
  endDate: z.string().min(1).optional(),
  goal: z.string().max(500).optional(),
  status: z.string().optional(),
  order: z.number().int().optional(),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = (await getServerSession(authOptions)) as AuthSession | null;
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const sprint = await prisma.sprint.findUnique({
      where: { id },
      include: {
        tasks: {
          include: {
            assignee: { select: { id: true, name: true, email: true } },
            project: { select: { id: true, name: true } },
          },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!sprint) {
      return NextResponse.json({ error: "Sprint not found" }, { status: 404 });
    }

    return NextResponse.json({ sprint, tasks: sprint.tasks });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = (await getServerSession(authOptions)) as AuthSession | null;
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const result = sprintUpdateSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: "Validation failed", details: result.error.errors }, { status: 400 });
  }

  try {
    const sprint = await prisma.sprint.update({
      where: { id },
      data: result.data,
    });
    return NextResponse.json({ sprint });
  } catch {
    return NextResponse.json({ error: "Sprint not found" }, { status: 404 });
  }
}
