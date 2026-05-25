import { useState } from 'react'
import { Sprint, CreateSprintInput } from './types'
import { SprintCard } from './SprintCard'
import { SprintForm } from './SprintForm'

interface SprintBoardProps {
  sprints: Sprint[]
  onReorder: (orderedIds: string[]) => void
  onCreateSprint?: (data: CreateSprintInput) => void
  onSelectSprint?: (id: string) => void
}

export function SprintBoard({ sprints, onReorder, onCreateSprint, onSelectSprint }: SprintBoardProps) {
  const [showForm, setShowForm] = useState(false)
  const [ordered, setOrdered] = useState<Sprint[]>(() =>
    [...sprints].sort((a, b) => a.order - b.order)
  )
  const [draggingId, setDraggingId] = useState<string | null>(null)

  const orderedSprints = sprints.length !== ordered.length
    ? [...sprints].sort((a, b) => a.order - b.order)
    : ordered

  const handleDragStart = (_e: React.DragEvent, id: string) => {
    setDraggingId(id)
  }

  const handleDrop = (_e: React.DragEvent, targetId: string) => {
    if (!draggingId || draggingId === targetId) return

    const next = [...orderedSprints]
    const fromIdx = next.findIndex((s) => s.id === draggingId)
    const toIdx = next.findIndex((s) => s.id === targetId)

    const [moved] = next.splice(fromIdx, 1)
    next.splice(toIdx, 0, moved)

    setOrdered(next)
    setDraggingId(null)
    onReorder(next.map((s) => s.id))
  }

  const handleFormSubmit = (data: CreateSprintInput) => {
    onCreateSprint?.(data)
    setShowForm(false)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">Sprints</h2>
        {!showForm && (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
          >
            + New Sprint
          </button>
        )}
      </div>

      {showForm && (
        <SprintForm
          onSubmit={handleFormSubmit}
          onCancel={() => setShowForm(false)}
        />
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {orderedSprints.map((sprint) => (
          <SprintCard
            key={sprint.id}
            sprint={sprint}
            onSelect={(id) => onSelectSprint?.(id)}
            isDragging={draggingId === sprint.id}
            onDragStart={handleDragStart}
            onDrop={handleDrop}
          />
        ))}
      </div>

      {orderedSprints.length === 0 && !showForm && (
        <p className="text-sm text-gray-500 text-center py-8">
          No sprints yet. Create one to get started.
        </p>
      )}
    </div>
  )
}
