import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";
import { emitTimeEntryUpdated, emitTimeEntryDeleted } from "@/lib/activity";
import { Session } from "next-auth";

type AuthSession = Session & { user: { id: string; role?: string } };

const UpdateTimeEntrySchema = z.object({
  minutes: z.number().int().min(1).max(1440).optional(),
  description: z.string().optional(),
  loggedAt: z
    .string()
    .datetime()
    .refine((d) => new Date(d) <= new Date(), {
      message: "loggedAt cannot be in the future",
    })
    .optional(),
});

async function getEntryWithTask(entryId: string) {
  return prisma.timeEntry.findUnique({
    where: { id: entryId },
    include: {
      task: {
        include: { project: { select: { id: true, name: true } } },
      },
      user: { select: { id: true, name: true } },
    },
  });
}

function canMutate(session: AuthSession, entryUserId: string | null): boolean {
  const role = session.user.role ?? "MEMBER";
  if (role === "VIEWER") return false;
  if (role === "ADMIN") return true;
  return entryUserId === session.user.id;
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string; entryId: string }> }
) {
  try {
    const session = (await getServerSession(authOptions)) as AuthSession | null;
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { entryId } = await params;
    const entry = await getEntryWithTask(entryId);

    if (!entry) {
      return NextResponse.json({ error: "Time entry not found" }, { status: 404 });
    }

    return NextResponse.json(entry);
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; entryId: string }> }
) {
  try {
    const session = (await getServerSession(authOptions)) as AuthSession | null;
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { entryId } = await params;
    const entry = await getEntryWithTask(entryId);

    if (!entry) {
      return NextResponse.json({ error: "Time entry not found" }, { status: 404 });
    }

    if (!canMutate(session, entry.userId)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const parseResult = UpdateTimeEntrySchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json({ error: parseResult.error.errors }, { status: 422 });
    }

    const { minutes, description, loggedAt } = parseResult.data;

    // Rebuild timestamps if either minutes or loggedAt changes
    let startedAt: Date | undefined;
    let stoppedAt: Date | undefined;

    if (loggedAt !== undefined || minutes !== undefined) {
      const base = loggedAt ? new Date(loggedAt) : entry.startedAt;
      const mins = minutes ?? entry.minutes ?? 0;
      startedAt = base;
      stoppedAt = new Date(base.getTime() + mins * 60 * 1000);
    }

    const updated = await prisma.timeEntry.update({
      where: { id: entryId },
      data: {
        ...(minutes !== undefined && { minutes }),
        ...(description !== undefined && { description }),
        ...(startedAt && { startedAt }),
        ...(stoppedAt && { stoppedAt }),
      },
      include: {
        user: { select: { id: true, name: true } },
      },
    });

    await emitTimeEntryUpdated(
      entry.task.project.id,
      session.user.id,
      entry.id,
      entry.task.title,
      updated.minutes ?? 0
    );

    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 422 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string; entryId: string }> }
) {
  try {
    const session = (await getServerSession(authOptions)) as AuthSession | null;
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { entryId } = await params;
    const entry = await getEntryWithTask(entryId);

    if (!entry) {
      return NextResponse.json({ error: "Time entry not found" }, { status: 404 });
    }

    if (!canMutate(session, entry.userId)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await prisma.timeEntry.delete({ where: { id: entryId } });

    await emitTimeEntryDeleted(
      entry.task.project.id,
      session.user.id,
      entry.id,
      entry.task.title
    );

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
