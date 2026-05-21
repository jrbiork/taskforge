import { prisma } from "@/lib/db";

export async function wouldCreateCycle(taskId: string, dependsOnId: string): Promise<boolean> {
  if (taskId === dependsOnId) return true;
  const visited = new Set<string>();
  const queue = [dependsOnId];
  while (queue.length) {
    const current = queue.shift()!;
    if (current === taskId) return true;
    if (visited.has(current)) continue;
    visited.add(current);
    const deps = await prisma.taskDependency.findMany({
      where: { taskId: current },
      select: { dependsOnId: true },
    });
    queue.push(...deps.map((d) => d.dependsOnId));
  }
  return false;
}
