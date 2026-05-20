import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getProjectActivity } from "@/lib/activity";
import { Session } from "next-auth";

type AuthSession = Session & { user: { id: string } };

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

    const project = await prisma.project.findUnique({ where: { id } });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const events = await getProjectActivity(id);

    return NextResponse.json({ events });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
