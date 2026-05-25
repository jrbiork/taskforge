import { useState, FormEvent } from 'react'
import { CreateSprintInput } from './types'

interface SprintFormProps {
  onSubmit: (data: CreateSprintInput) => void
  onCancel: () => void
}

export function SprintForm({ onSubmit, onCancel }: SprintFormProps) {
  const [name, setName] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [goal, setGoal] = useState('')
  const [errors, setErrors] = useState<string[]>([])

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    const errs: string[] = []
    if (!startDate) errs.push('Start date is required')
    if (!endDate) errs.push('End date is required')
    if (startDate && endDate && endDate <= startDate) errs.push('End date must be after start date')
    if (errs.length > 0) { setErrors(errs); return }
    setErrors([])
    onSubmit({
      name,
      startDate,
      endDate,
      ...(goal.trim() ? { goal: goal.trim() } : {}),
    })
  }

  const isSubmitDisabled = !name.trim()

  return (
    <form onSubmit={handleSubmit} noValidate className="bg-white border rounded-lg p-6 space-y-4">
      <h2 className="text-lg font-semibold text-gray-900">New Sprint</h2>

      {errors.length > 0 && (
        <ul className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 space-y-1">
          {errors.map((err) => <li key={err}>{err}</li>)}
        </ul>
      )}

      <div className="space-y-1">
        <label htmlFor="sprint-name" className="block text-sm font-medium text-gray-700">
          Name <span className="text-red-500">*</span>
        </label>
        <input
          id="sprint-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Sprint 1"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <label htmlFor="sprint-start" className="block text-sm font-medium text-gray-700">
            Start date <span className="text-red-500">*</span>
          </label>
          <input
            id="sprint-start"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="sprint-end" className="block text-sm font-medium text-gray-700">
            End date <span className="text-red-500">*</span>
          </label>
          <input
            id="sprint-end"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div className="space-y-1">
        <label htmlFor="sprint-goal" className="block text-sm font-medium text-gray-700">
          Goal
        </label>
        <textarea
          id="sprint-goal"
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
          rows={3}
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          placeholder="What should this sprint achieve?"
        />
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitDisabled}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Create Sprint
        </button>
      </div>
    </form>
  )
}
