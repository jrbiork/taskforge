import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Session } from "next-auth";

type AuthSession = Session & { user: { id: string } };

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = (await getServerSession(authOptions)) as AuthSession | null;
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  let body: { taskId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.taskId) {
    return NextResponse.json({ error: "taskId is required" }, { status: 400 });
  }

  const existing = await prisma.task.findUnique({ where: { id: body.taskId } });
  if (!existing) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  const task = await prisma.task.update({
    where: { id: body.taskId },
    data: { sprintId: id },
  });

  return NextResponse.json({ task });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = (await getServerSession(authOptions)) as AuthSession | null;
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await params; // consume params even though we don't need id for the update

  let body: { taskId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.taskId) {
    return NextResponse.json({ error: "taskId is required" }, { status: 400 });
  }

  const existing = await prisma.task.findUnique({ where: { id: body.taskId } });
  if (!existing) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  const task = await prisma.task.update({
    where: { id: body.taskId },
    data: { sprintId: null },
  });

  return NextResponse.json({ task });
}
