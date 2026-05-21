import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { wouldCreateCycle } from "@/lib/dependencies";
import { z } from "zod";
import { Session } from "next-auth";

type AuthSession = Session & { user: { id: string } };

const dependencySchema = z.object({
  dependsOnId: z.string(),
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

    const { id: taskId } = await params;
    const body = await req.json();
    const { dependsOnId } = dependencySchema.parse(body);

    const [task, prerequisite] = await Promise.all([
      prisma.task.findUnique({ where: { id: taskId } }),
      prisma.task.findUnique({ where: { id: dependsOnId } }),
    ]);

    if (!task || !prerequisite) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    if (task.projectId !== prerequisite.projectId) {
      return NextResponse.json(
        { error: "Dependencies must be within the same project" },
        { status: 400 }
      );
    }

    const hasCycle = await wouldCreateCycle(taskId, dependsOnId);
    if (hasCycle) {
      return NextResponse.json(
        { error: "This dependency would create a circular dependency" },
        { status: 422 }
      );
    }

    const dependency = await prisma.taskDependency.create({
      data: { taskId, dependsOnId },
      include: {
        dependsOn: { select: { id: true, title: true, status: true } },
      },
    });

    return NextResponse.json(dependency, { status: 201 });
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

    const { id: taskId } = await params;
    const body = await req.json();
    const { dependsOnId } = dependencySchema.parse(body);

    const dependency = await prisma.taskDependency.findUnique({
      where: { taskId_dependsOnId: { taskId, dependsOnId } },
    });

    if (!dependency) {
      return NextResponse.json({ error: "Dependency not found" }, { status: 404 });
    }

    await prisma.taskDependency.delete({
      where: { taskId_dependsOnId: { taskId, dependsOnId } },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
