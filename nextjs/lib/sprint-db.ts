import { randomUUID } from 'crypto'

export interface Sprint {
  id: string
  name: string
  startDate: string
  endDate: string
  goal?: string
  status: 'PLANNING' | 'ACTIVE' | 'COMPLETED'
  taskCount: number
  order: number
  createdAt: string
}

export interface CreateSprintInput {
  name: string
  startDate: string
  endDate: string
  goal?: string
}

const sprintsStore = new Map<string, Sprint>()

export async function getAllSprints(): Promise<Sprint[]> {
  return Array.from(sprintsStore.values()).sort((a, b) => a.order - b.order)
}

export async function createSprint(input: CreateSprintInput): Promise<Sprint> {
  const id = randomUUID()
  const sprint: Sprint = {
    id,
    name: input.name,
    startDate: input.startDate,
    endDate: input.endDate,
    goal: input.goal,
    status: 'PLANNING',
    taskCount: 0,
    order: sprintsStore.size + 1,
    createdAt: new Date().toISOString(),
  }
  sprintsStore.set(id, sprint)
  return sprint
}
