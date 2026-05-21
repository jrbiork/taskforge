# Add Task Filtering to TaskBoard

## Overview

Add client-side filter and search functionality to the `TaskBoard` component so users can narrow down visible tasks without a server round-trip. Filtering state will be reflected in URL search params so results are shareable and survive page refresh.

## Why

As projects grow, the task board becomes difficult to scan. Users need a fast way to isolate tasks by status or find a specific task by keyword without leaving the board view.

## Acceptance Criteria

- [ ] Status filter dropdown using the `TaskStatus` enum values (`TODO`, `IN_PROGRESS`, `DONE`) — selecting a value hides tasks that don't match
- [ ] Text search input that filters tasks by title (case-insensitive, substring match)
- [ ] Both filter state stored in URL search params via `next/navigation` (`useSearchParams` / `useRouter`)
- [ ] Clear button resets both filters and removes params from the URL
- [ ] Filtering is purely client-side — no additional API calls triggered
- [ ] When no tasks match the active filters, show an empty state message

## Technical Notes

**Files to modify:**

- `nextjs/components/task-board.tsx` — wire up filter state, derive filtered task list, pass down to columns
- `nextjs/lib/types.ts` — confirm `TaskStatus` enum is exported and reusable

**New components to create:**

- `nextjs/components/task-filters.tsx` — contains the status dropdown + search input + clear button; accepts current filter values and `onChange` callbacks as props

**Routing:**

- Use `useSearchParams()` to read initial state and `useRouter().push()` (with `shallow` equivalent in App Router) to update params without full navigation
- Param names: `status` and `q`

## Plan

### Files

| Action | Path                                            |
| ------ | ----------------------------------------------- |
| CREATE | `nextjs/components/task-filters.tsx`            |
| MODIFY | `nextjs/components/task-board.tsx`              |
| CREATE | `nextjs/tests/components/task-filters.test.tsx` |
| CREATE | `nextjs/tests/components/task-board.test.tsx`   |

### Step 1 — Create `nextjs/components/task-filters.tsx`

Controlled presentational component. No routing logic — owns no state.

**Props:**

```ts
interface TaskFiltersProps {
  searchQuery: string;
  statusFilter: TaskStatus | ''; // "" = no filter (All)
  onSearchChange: (value: string) => void;
  onStatusChange: (value: TaskStatus | '') => void;
  onClear: () => void;
}
```

**JSX:** `<div className="flex flex-wrap gap-3 mb-6 items-center">` containing:

- `<Input aria-label="Search tasks" ...>` from `@/components/ui/input`
- `<Select>` from `@/components/ui/select` with options: `""` → "All Statuses", `"TODO"` → "To Do", `"IN_PROGRESS"` → "In Progress", `"DONE"` → "Done"
- `<Button variant="outline" onClick={onClear}>Clear filters</Button>` — rendered only when `searchQuery !== "" || statusFilter !== ""`

### Step 2 — Modify `nextjs/components/task-board.tsx`

**a)** Add to imports:

```ts
import { useSearchParams } from 'next/navigation'; // alongside existing useRouter
import { TaskFilters } from './task-filters';
import { TaskStatus } from '@/lib/types';
```

**b)** After `const router = useRouter();`, add:

```ts
const searchParams = useSearchParams();
const searchQuery = searchParams.get('q') ?? '';
const statusFilter = (searchParams.get('status') ?? '') as TaskStatus | '';
```

**c)** Replace lines 19–21 (three hardcoded status filters) with:

```ts
const filteredTasks = tasks.filter((task) => {
  const matchesSearch =
    searchQuery === '' ||
    task.title.toLowerCase().includes(searchQuery.toLowerCase());
  const matchesStatus = statusFilter === '' || task.status === statusFilter;
  return matchesSearch && matchesStatus;
});

const todoTasks = filteredTasks.filter((t) => t.status === 'TODO');
const inProgressTasks = filteredTasks.filter((t) => t.status === 'IN_PROGRESS');
const doneTasks = filteredTasks.filter((t) => t.status === 'DONE');
```

**d)** Add three handlers:

```ts
const handleSearchChange = (value: string) => {
  const params = new URLSearchParams(searchParams.toString());
  if (value) {
    params.set('q', value);
  } else {
    params.delete('q');
  }
  router.replace(`?${params.toString()}`, { scroll: false });
};

const handleStatusChange = (value: TaskStatus | '') => {
  const params = new URLSearchParams(searchParams.toString());
  if (value) {
    params.set('status', value);
  } else {
    params.delete('status');
  }
  router.replace(`?${params.toString()}`, { scroll: false });
};

const handleClear = () => router.replace('?', { scroll: false });
```

> Use `router.replace` (not `push`) so filter changes don't pollute history.
> `{ scroll: false }` prevents page jumping on each keystroke.

**e)** Wrap the return: add `<TaskFilters ...>` above the existing grid, both inside a new `<div>`:

```tsx
return (
  <div>
    <TaskFilters
      searchQuery={searchQuery}
      statusFilter={statusFilter}
      onSearchChange={handleSearchChange}
      onStatusChange={handleStatusChange}
      onClear={handleClear}
    />
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* existing columns unchanged */}
    </div>
  </div>
);
```

### Step 3 — Create `nextjs/tests/components/task-filters.test.tsx`

Mock `@/components/ui/select` as a native `<select>` (avoids Radix portal issues in jsdom):

```ts
jest.mock("@/components/ui/select", () => ({
  Select: ({ children, onValueChange, value }: { children: React.ReactNode; onValueChange?: (v: string) => void; value: string }) => (
    <select data-testid="status-select" value={value}
      onChange={(e) => onValueChange?.(e.target.value)}>{children}</select>
  ),
  SelectTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  SelectValue: ({ placeholder }: { placeholder?: string }) => <option value="">{placeholder}</option>,
  SelectContent: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  SelectItem: ({ children, value }: { children: React.ReactNode; value: string }) => (
    <option value={value}>{children}</option>
  ),
}));
```

Test cases (10): renders search input; renders status select; clear button absent when no filters active; clear button present when `searchQuery` set; when `statusFilter` set; when both set; `onSearchChange` called with typed value; `onStatusChange` called with `"TODO"`; called with `""` for All Statuses; `onClear` called on clear click.

### Step 4 — Create `nextjs/tests/components/task-board.test.tsx`

```ts
const mockReplace = jest.fn();
const mockGet = jest.fn().mockReturnValue(null);

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), replace: mockReplace }),
  useSearchParams: () => ({ get: mockGet, toString: () => "" }),
}));
jest.mock("@/components/task-filters", () => ({
  TaskFilters: ({ onSearchChange, onStatusChange, onClear }: any) => (
    <div>
      <button onClick={() => onSearchChange("fix bug")} data-testid="mock-search" />
      <button onClick={() => onStatusChange("TODO")} data-testid="mock-status" />
      <button onClick={onClear} data-testid="mock-clear" />
    </div>
  ),
}));
jest.mock("@/components/task-card", () => ({
  TaskCard: ({ task }: any) => <div data-testid="task-card">{task.title}</div>,
}));
```

Test cases (~15): three column headers render; tasks appear in correct columns; correct counts; title search (match visible, no-match hidden, empty state); status filter (TODO only, IN_PROGRESS hidden, `""` shows all); combined filters; `router.replace` called correctly for each handler; param deleted when value cleared.

### Verification

```bash
cd nextjs
npx tsc --noEmit                                              # zero type errors
npx jest --testPathPattern="task-filters|task-board" --coverage  # 100% coverage
npm test                                                      # full suite, no regressions
```

**Manual browser checklist:**

- [ ] Filter bar renders above the board
- [ ] Typing hides non-matching tasks; URL shows `?q=<value>`
- [ ] Status dropdown filters tasks; URL shows `?status=<value>`
- [ ] Both filters show intersection
- [ ] Clear removes params and restores all tasks
- [ ] Hard-refresh with params pre-applies filters
- [ ] Network tab: zero extra API calls when filtering

## GitHub Issue

https://github.com/jrbiork/taskforge/issues/2
