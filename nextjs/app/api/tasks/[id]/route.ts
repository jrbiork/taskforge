import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";
import { notifyTaskAssigned, notifyTaskCompleted } from "@/lib/notifications";
import { emitTaskStatusChanged, emitTaskAssigned, emitTaskUpdated, emitTaskDeleted } from "@/lib/activity";
import { Session } from "next-auth";

type AuthSession = Session & { user: { id: string } };

const taskUpdateSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  status: z.enum(["TODO", "IN_PROGRESS", "DONE"]).optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
  assigneeId: z.string().nullable().optional(),
  sprintId: z.string().nullable().optional(),
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

    const task = await prisma.task.findUnique({
      where: { id },
      include: {
        assignee: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        project: {
          select: {
            id: true,
            name: true,
          },
        },
        comments: {
          include: {
            author: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
          orderBy: {
            createdAt: "asc",
          },
        },
        dependencies: {
          include: {
            dependsOn: { select: { id: true, title: true, status: true } },
          },
        },
        dependents: {
          include: {
            task: { select: { id: true, title: true, status: true } },
          },
        },
      },
    });

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    return NextResponse.json(task);
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
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
    const data = taskUpdateSchema.parse(body);

    const task = await prisma.task.findUnique({
      where: { id },
      include: { project: { select: { ownerId: true } } },
    });

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    const updatedTask = await prisma.task.update({
      where: { id },
      data,
      include: {
        assignee: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        project: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (data.assigneeId && data.assigneeId !== task.assigneeId) {
      await notifyTaskAssigned(
        task.id,
        task.title,
        task.projectId,
        data.assigneeId,
        session.user.id
      );
    }

    if (data.status === "DONE" && task.status !== "DONE") {
      await notifyTaskCompleted(
        task.id,
        task.title,
        task.projectId,
        task.assigneeId,
        task.project.ownerId,
        session.user.id
      );
    }

    if (data.status !== undefined && data.status !== task.status) {
      await emitTaskStatusChanged(task.projectId, session.user.id, task.id, task.title, task.status, data.status);
    }

    if ("assigneeId" in data && data.assigneeId !== undefined && data.assigneeId !== task.assigneeId) {
      const assigneeName = updatedTask.assignee?.name ?? null;
      await emitTaskAssigned(task.projectId, session.user.id, task.id, task.title, assigneeName);
    }

    const genericFields = Object.keys(data).filter((k) => k !== "status" && k !== "assigneeId");
    if (genericFields.length > 0) {
      await emitTaskUpdated(task.projectId, session.user.id, task.id, task.title, genericFields);
    }

    return NextResponse.json(updatedTask);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
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

    const task = await prisma.task.findUnique({
      where: { id },
    });

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    await prisma.task.delete({
      where: { id },
    });

    await emitTaskDeleted(task.projectId, session.user.id, task.id, task.title);

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
