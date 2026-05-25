import { render, screen, fireEvent } from '@testing-library/react';
import { TaskCard } from '@/components/task-card';

jest.mock('@/components/ui/select', () => ({
  Select: ({ value, onValueChange, children }: { value: string; onValueChange?: (v: string) => void; children: React.ReactNode }) => (
    <div data-testid="sprint-select" data-value={value}>
      <button onClick={() => onValueChange?.('sprint-1')} data-testid="select-trigger">
        {value === 'none' ? 'No sprint' : value}
      </button>
      {children}
    </div>
  ),
  SelectTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  SelectValue: ({ placeholder }: { placeholder?: string }) => <span>{placeholder}</span>,
  SelectContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectItem: ({ value, children }: { value: string; children: React.ReactNode }) => (
    <div data-value={value}>{children}</div>
  ),
}));

const baseTask = {
  id: '1',
  title: 'Test Task',
  description: 'Test Description',
  status: 'TODO' as const,
  priority: 'HIGH' as const,
  projectId: 'project-1',
  assigneeId: 'user-1',
  sprintId: null,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  assignee: {
    id: 'user-1',
    name: 'John Doe',
    email: 'john@example.com',
  },
};

const sprints = [
  { id: 'sprint-1', name: 'Sprint 1', startDate: '2024-01-01', endDate: '2024-01-14', status: 'PLANNING' as const, taskCount: 0, order: 1 },
  { id: 'sprint-2', name: 'Sprint 2', startDate: '2024-01-15', endDate: '2024-01-28', status: 'ACTIVE' as const, taskCount: 2, order: 2 },
];

describe('TaskCard', () => {
  it('renders task title', () => {
    render(<TaskCard task={baseTask} />);
    expect(screen.getByText('Test Task')).toBeInTheDocument();
  });

  it('renders task description', () => {
    render(<TaskCard task={baseTask} />);
    expect(screen.getByText('Test Description')).toBeInTheDocument();
  });

  it('renders assignee name', () => {
    render(<TaskCard task={baseTask} />);
    expect(screen.getByText('John Doe')).toBeInTheDocument();
  });

  it('renders priority badge', () => {
    render(<TaskCard task={baseTask} />);
    expect(screen.getByText('HIGH')).toBeInTheDocument();
  });

  it('renders unassigned when no assignee', () => {
    render(<TaskCard task={{ ...baseTask, assignee: null }} />);
    expect(screen.getByText('Unassigned')).toBeInTheDocument();
  });

  it('does not show blocked badge with no dependencies', () => {
    render(<TaskCard task={{ ...baseTask, dependencies: [] }} />);
    expect(screen.queryByText('Blocked')).not.toBeInTheDocument();
  });

  it('shows blocked badge when a dependency is not DONE', () => {
    const dep = {
      id: 'dep-1',
      taskId: '1',
      dependsOnId: '2',
      createdAt: new Date(),
      dependsOn: { id: '2', title: 'Prereq', status: 'TODO' },
    };
    render(<TaskCard task={{ ...baseTask, dependencies: [dep] }} />);
    expect(screen.getByText('Blocked')).toBeInTheDocument();
  });

  it('does not show blocked badge when all dependencies are DONE', () => {
    const dep = {
      id: 'dep-1',
      taskId: '1',
      dependsOnId: '2',
      createdAt: new Date(),
      dependsOn: { id: '2', title: 'Prereq', status: 'DONE' },
    };
    render(<TaskCard task={{ ...baseTask, dependencies: [dep] }} />);
    expect(screen.queryByText('Blocked')).not.toBeInTheDocument();
  });

  it('shows blocked badge when at least one of multiple dependencies is not DONE', () => {
    const deps = [
      {
        id: 'dep-1',
        taskId: '1',
        dependsOnId: '2',
        createdAt: new Date(),
        dependsOn: { id: '2', title: 'Done task', status: 'DONE' },
      },
      {
        id: 'dep-2',
        taskId: '1',
        dependsOnId: '3',
        createdAt: new Date(),
        dependsOn: { id: '3', title: 'Pending task', status: 'IN_PROGRESS' },
      },
    ];
    render(<TaskCard task={{ ...baseTask, dependencies: deps }} />);
    expect(screen.getByText('Blocked')).toBeInTheDocument();
  });

  it('shows time badge when totalMinutes is greater than 0', () => {
    render(<TaskCard task={{ ...baseTask, totalMinutes: 90 }} />);
    expect(screen.getByText('1h 30m')).toBeInTheDocument();
  });

  it('does not show time badge when totalMinutes is 0', () => {
    render(<TaskCard task={{ ...baseTask, totalMinutes: 0 }} />);
    expect(screen.queryByText(/\d+h|\d+m/)).not.toBeInTheDocument();
  });

  it('does not show time badge when totalMinutes is undefined', () => {
    render(<TaskCard task={{ ...baseTask }} />);
    // The priority badge shows "HIGH" but no time badge
    expect(screen.queryByText('0m')).not.toBeInTheDocument();
  });

  it('shows formatted minutes-only time badge for sub-hour durations', () => {
    render(<TaskCard task={{ ...baseTask, totalMinutes: 45 }} />);
    expect(screen.getByText('45m')).toBeInTheDocument();
  });

  it('shows hours-only time badge for exact hour durations', () => {
    render(<TaskCard task={{ ...baseTask, totalMinutes: 120 }} />);
    expect(screen.getByText('2h')).toBeInTheDocument();
  });
});

describe('TaskCard sprint select', () => {
  it('does not render sprint select when sprints prop is omitted', () => {
    render(<TaskCard task={baseTask} />);
    expect(screen.queryByTestId('sprint-select')).not.toBeInTheDocument();
  });

  it('renders sprint select when sprints prop is provided', () => {
    render(<TaskCard task={baseTask} sprints={sprints} />);
    expect(screen.getByTestId('sprint-select')).toBeInTheDocument();
  });

  it('shows "No sprint" when task has no sprint assigned', () => {
    render(<TaskCard task={{ ...baseTask, sprintId: null }} sprints={sprints} />);
    expect(screen.getByTestId('sprint-select')).toHaveAttribute('data-value', 'none');
  });

  it('shows current sprint id when task has a sprint assigned', () => {
    render(<TaskCard task={{ ...baseTask, sprintId: 'sprint-2' }} sprints={sprints} />);
    expect(screen.getByTestId('sprint-select')).toHaveAttribute('data-value', 'sprint-2');
  });

  it('calls onSprintChange when a sprint is selected', () => {
    const onSprintChange = jest.fn();
    render(<TaskCard task={baseTask} sprints={sprints} onSprintChange={onSprintChange} />);
    fireEvent.click(screen.getByTestId('select-trigger'));
    expect(onSprintChange).toHaveBeenCalledWith('sprint-1');
  });

  it('does not fire card onClick when clicking the sprint select', () => {
    const onCardClick = jest.fn();
    render(<TaskCard task={baseTask} sprints={sprints} onClick={onCardClick} />);
    fireEvent.click(screen.getByTestId('sprint-select'));
    expect(onCardClick).not.toHaveBeenCalled();
  });
});
