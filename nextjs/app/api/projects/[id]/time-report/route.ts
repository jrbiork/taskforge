import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { Session } from "next-auth";

type AuthSession = Session & { user: { id: string; role?: string } };

type RawReportRow = {
  taskId: string;
  userId: string | null;
  totalMinutes: bigint | number;
};

type ReportTaskRow = {
  taskId: string;
  taskTitle: string;
  totalMinutes: number;
  byUser: Array<{ userId: string | null; totalMinutes: number }>;
};

type TimeReportResponse = {
  projectId: string;
  totalMinutes: number;
  tasks: ReportTaskRow[];
};

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = (await getServerSession(authOptions)) as AuthSession | null;
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = session.user.role ?? "MEMBER";
    // VIEWERs can read reports (read-only access is fine per spec)
    // Only authenticated users with project access may view reports

    const { id: projectId } = await params;

    // Verify project exists and current user has access (is owner or ADMIN)
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true, ownerId: true },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Only the project owner or an ADMIN can view the time report
    if (role !== "ADMIN" && project.ownerId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const filterUserId = searchParams.get("userId");
    const startDateStr = searchParams.get("startDate");
    const endDateStr = searchParams.get("endDate");

    const startDate = startDateStr ? new Date(startDateStr) : null;
    const endDate = endDateStr ? new Date(endDateStr) : null;

    // Use $queryRaw with Prisma.sql for safe parameterized GROUP BY aggregation
    // SQLite stores table name as "TimeEntry"
    const rows = await prisma.$queryRaw<RawReportRow[]>(Prisma.sql`
      SELECT
        te.taskId,
        te.userId,
        SUM(te.minutes) as totalMinutes
      FROM "TimeEntry" te
      INNER JOIN "Task" t ON t.id = te.taskId
      WHERE t.projectId = ${projectId}
        AND te.stoppedAt IS NOT NULL
        AND te.minutes IS NOT NULL
        ${filterUserId ? Prisma.sql`AND te.userId = ${filterUserId}` : Prisma.empty}
        ${startDate ? Prisma.sql`AND te.startedAt >= ${startDate.toISOString()}` : Prisma.empty}
        ${endDate ? Prisma.sql`AND te.stoppedAt <= ${endDate.toISOString()}` : Prisma.empty}
      GROUP BY te.taskId, te.userId
    `);

    // Fetch task titles for the referenced tasks
    const taskIds = [...new Set(rows.map((r) => r.taskId))];
    const tasks = taskIds.length > 0
      ? await prisma.task.findMany({
          where: { id: { in: taskIds } },
          select: { id: true, title: true },
        })
      : [];
    const taskTitleMap = new Map(tasks.map((t) => [t.id, t.title]));

    // Group rows by task
    const byTask = new Map<string, ReportTaskRow>();
    for (const row of rows) {
      const mins = Number(row.totalMinutes);
      if (!byTask.has(row.taskId)) {
        byTask.set(row.taskId, {
          taskId: row.taskId,
          taskTitle: taskTitleMap.get(row.taskId) ?? "Unknown",
          totalMinutes: 0,
          byUser: [],
        });
      }
      const taskRow = byTask.get(row.taskId)!;
      taskRow.totalMinutes += mins;
      taskRow.byUser.push({ userId: row.userId, totalMinutes: mins });
    }

    const taskList = Array.from(byTask.values());
    const projectTotal = taskList.reduce((sum, t) => sum + t.totalMinutes, 0);

    const response: TimeReportResponse = {
      projectId,
      totalMinutes: projectTotal,
      tasks: taskList,
    };

    return NextResponse.json(response);
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
