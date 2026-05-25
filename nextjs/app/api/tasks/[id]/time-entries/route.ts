import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";
import { emitTimeEntryAdded } from "@/lib/activity";
import { computeMinutes } from "@/lib/time-utils";
import { Session } from "next-auth";

type AuthSession = Session & { user: { id: string; role?: string } };

// loggedAt must not be in the future
const CreateTimeEntrySchema = z.object({
  minutes: z.number().int().min(1).max(1440),
  description: z.string().optional(),
  loggedAt: z
    .string()
    .datetime()
    .refine((d) => new Date(d) <= new Date(), {
      message: "loggedAt cannot be in the future",
    }),
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

    const { id: taskId } = await params;

    const task = await prisma.task.findUnique({ where: { id: taskId } });
    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    const entries = await prisma.timeEntry.findMany({
      where: { taskId },
      include: {
        user: { select: { id: true, name: true } },
      },
      orderBy: { startedAt: "desc" },
    });

    return NextResponse.json(entries);
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = (await getServerSession(authOptions)) as AuthSession | null;
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = session.user.role ?? "MEMBER";
    if (role === "VIEWER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id: taskId } = await params;

    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: { project: { select: { id: true, name: true } } },
    });
    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    const body = await req.json();
    const parseResult = CreateTimeEntrySchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json({ error: parseResult.error.errors }, { status: 422 });
    }

    const { minutes, description, loggedAt } = parseResult.data;

    // For manual entries: startedAt = loggedAt, stoppedAt = loggedAt + minutes * 60s
    const startedAt = new Date(loggedAt);
    const stoppedAt = new Date(startedAt.getTime() + minutes * 60 * 1000);

    const entry = await prisma.timeEntry.create({
      data: {
        taskId,
        userId: session.user.id,
        startedAt,
        stoppedAt,
        minutes,
        description,
      },
      include: {
        user: { select: { id: true, name: true } },
      },
    });

    await emitTimeEntryAdded(task.project.id, session.user.id, entry.id, task.title, minutes);

    return NextResponse.json(entry, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 422 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
