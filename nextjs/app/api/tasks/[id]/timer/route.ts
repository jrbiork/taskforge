import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";
import { emitTimeEntryAdded } from "@/lib/activity";
import { computeMinutes } from "@/lib/time-utils";
import { Session } from "next-auth";

type AuthSession = Session & { user: { id: string; role?: string } };

const TimerActionSchema = z.object({
  action: z.enum(["start", "stop"]),
});

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
      include: { project: { select: { id: true } } },
    });
    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    const body = await req.json();
    const parseResult = TimerActionSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json({ error: parseResult.error.errors }, { status: 422 });
    }

    const { action } = parseResult.data;
    const userId = session.user.id;
    const now = new Date();

    if (action === "start") {
      // Atomically stop any existing running timer for this user, then create a new one
      const result = await prisma.$transaction(async (tx) => {
        // Find any open timer for this user (across all tasks)
        const openTimer = await tx.timeEntry.findFirst({
          where: { userId, stoppedAt: null },
        });

        // Stop existing open timer if present
        if (openTimer) {
          const elapsedMinutes = computeMinutes(openTimer.startedAt, now);
          await tx.timeEntry.update({
            where: { id: openTimer.id },
            data: {
              stoppedAt: now,
              minutes: elapsedMinutes,
            },
          });
        }

        // Start new timer on the requested task
        return tx.timeEntry.create({
          data: {
            taskId,
            userId,
            startedAt: now,
            stoppedAt: null,
            minutes: null,
          },
          include: {
            user: { select: { id: true, name: true } },
          },
        });
      });

      return NextResponse.json(result, { status: 201 });
    }

    // action === "stop"
    const stopResult = await prisma.$transaction(async (tx) => {
      const openEntry = await tx.timeEntry.findFirst({
        where: { taskId, userId, stoppedAt: null },
      });

      if (!openEntry) return null;

      const elapsedMinutes = computeMinutes(openEntry.startedAt, now);

      return tx.timeEntry.update({
        where: { id: openEntry.id },
        data: {
          stoppedAt: now,
          minutes: elapsedMinutes,
        },
        include: {
          user: { select: { id: true, name: true } },
        },
      });
    });

    if (!stopResult) {
      return NextResponse.json({ error: "No running timer for this task" }, { status: 404 });
    }

    await emitTimeEntryAdded(task.project.id, session.user.id, stopResult.id, task.title, stopResult.minutes ?? 0);

    return NextResponse.json(stopResult);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 422 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

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
    const userId = session.user.id;

    const activeEntry = await prisma.timeEntry.findFirst({
      where: { taskId, userId, stoppedAt: null },
      include: {
        user: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(activeEntry ?? null);
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
