import { Sprint, SprintStatus } from './types'

const statusStyles: Record<SprintStatus, string> = {
  PLANNING: 'bg-gray-100 text-gray-700',
  ACTIVE: 'bg-green-100 text-green-700',
  COMPLETED: 'bg-blue-100 text-blue-700',
}

interface SprintCardProps {
  sprint: Sprint
  onSelect: (id: string) => void
  isDragging?: boolean
  onDragStart?: (e: React.DragEvent, id: string) => void
  onDragOver?: (e: React.DragEvent) => void
  onDrop?: (e: React.DragEvent, id: string) => void
}

export function SprintCard({
  sprint,
  onSelect,
  isDragging = false,
  onDragStart,
  onDragOver,
  onDrop,
}: SprintCardProps) {
  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })

  return (
    <div
      className={`bg-white border rounded-lg p-4 cursor-pointer hover:shadow-md transition-shadow ${
        isDragging ? 'opacity-50' : ''
      }`}
      draggable
      onClick={() => onSelect(sprint.id)}
      onDragStart={(e) => onDragStart?.(e, sprint.id)}
      onDragOver={(e) => {
        e.preventDefault()
        onDragOver?.(e)
      }}
      onDrop={(e) => {
        e.preventDefault()
        onDrop?.(e, sprint.id)
      }}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <h3 className="font-semibold text-gray-900 text-sm leading-tight">{sprint.name}</h3>
        <span className={`shrink-0 text-xs font-medium px-2 py-0.5 rounded-full ${statusStyles[sprint.status]}`}>
          {sprint.status}
        </span>
      </div>

      <div className="text-xs text-gray-500 mb-3">
        {formatDate(sprint.startDate)} – {formatDate(sprint.endDate)}
      </div>

      {sprint.goal && (
        <p className="text-xs text-gray-600 mb-3 line-clamp-2">{sprint.goal}</p>
      )}

      <div className="text-xs text-gray-500">
        {sprint.taskCount} {sprint.taskCount === 1 ? 'task' : 'tasks'}
      </div>
    </div>
  )
}
