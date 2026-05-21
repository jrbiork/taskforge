export function detectCircularDependency(
  graph: Record<string, string[]>,
  taskId: string,
  newDependsOnId: string
): boolean {
  if (taskId === newDependsOnId) return true;
  const visited = new Set<string>();
  const queue = [newDependsOnId];
  while (queue.length) {
    const current = queue.shift()!;
    if (current === taskId) return true;
    if (visited.has(current)) continue;
    visited.add(current);
    queue.push(...(graph[current] ?? []));
  }
  return false;
}
