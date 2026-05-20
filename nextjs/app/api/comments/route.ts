import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";
import { notifyMentions } from "@/lib/notifications";
import { emitCommentAdded } from "@/lib/activity";
import { Session } from "next-auth";

type AuthSession = Session & { user: { id: string } };

const commentSchema = z.object({
  content: z.string().min(1),
  taskId: z.string(),
});

export async function POST(req: Request) {
  try {
    const session = (await getServerSession(authOptions)) as AuthSession | null;

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { content, taskId } = commentSchema.parse(body);

    const task = await prisma.task.findUnique({
      where: { id: taskId },
      select: { projectId: true, title: true },
    });

    const comment = await prisma.comment.create({
      data: {
        content,
        taskId,
        authorId: session.user.id,
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (task) {
      await notifyMentions(taskId, task.projectId, content, session.user.id);
      await emitCommentAdded(task.projectId, session.user.id, comment.id, task.title, content);
    }

    return NextResponse.json(comment, { status: 201 });
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
