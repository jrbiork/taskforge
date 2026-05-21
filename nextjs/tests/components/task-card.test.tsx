import { render, screen } from '@testing-library/react';
import { TaskCard } from '@/components/task-card';

const baseTask = {
  id: '1',
  title: 'Test Task',
  description: 'Test Description',
  status: 'TODO' as const,
  priority: 'HIGH' as const,
  projectId: 'project-1',
  assigneeId: 'user-1',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  assignee: {
    id: 'user-1',
    name: 'John Doe',
    email: 'john@example.com',
  },
};

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
});
