export type SprintStatus = 'PLANNING' | 'ACTIVE' | 'COMPLETED'

export interface Sprint {
  id: string
  name: string
  startDate: string
  endDate: string
  goal?: string
  status: SprintStatus
  taskCount: number
  order: number
}

export interface CreateSprintInput {
  name: string
  startDate: string
  endDate: string
  goal?: string
}
