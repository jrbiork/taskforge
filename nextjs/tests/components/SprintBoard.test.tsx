import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Sprint, CreateSprintInput } from '@/components/sprint/types';

jest.mock('@/components/sprint/SprintCard', () => ({
  SprintCard: ({
    sprint,
    onSelect,
    onDragStart,
    onDragOver,
    onDrop,
  }: {
    sprint: Sprint;
    onSelect: (id: string) => void;
    onDragStart?: (e: React.DragEvent, id: string) => void;
    onDragOver?: (e: React.DragEvent) => void;
    onDrop?: (e: React.DragEvent, id: string) => void;
  }) => (
    <div
      data-testid="sprint-card"
      data-sprint-id={sprint.id}
      draggable
      onClick={() => onSelect(sprint.id)}
      onDragStart={(e) => onDragStart?.(e, sprint.id)}
      onDragOver={(e) => onDragOver?.(e)}
      onDrop={(e) => onDrop?.(e, sprint.id)}
    >
      {sprint.name}
    </div>
  ),
}));

jest.mock('@/components/sprint/SprintForm', () => ({
  SprintForm: ({
    onSubmit,
    onCancel,
  }: {
    onSubmit: (data: CreateSprintInput) => void;
    onCancel: () => void;
  }) => (
    <div data-testid="sprint-form">
      <button
        onClick={() =>
          onSubmit({
            name: 'New Sprint',
            startDate: '2024-01-01',
            endDate: '2024-01-14',
          })
        }
      >
        Submit
      </button>
      <button onClick={onCancel}>Cancel</button>
    </div>
  ),
}));

import { SprintBoard } from '@/components/sprint/SprintBoard';

const makeSprint = (overrides: Partial<Sprint> = {}): Sprint => ({
  id: 'sprint-1',
  name: 'Sprint 1',
  startDate: '2024-01-01',
  endDate: '2024-01-14',
  status: 'PLANNING',
  taskCount: 3,
  order: 1,
  ...overrides,
});

const sprints: Sprint[] = [
  makeSprint({ id: 's1', name: 'Sprint Alpha', order: 1 }),
  makeSprint({ id: 's2', name: 'Sprint Beta', order: 2 }),
  makeSprint({ id: 's3', name: 'Sprint Gamma', order: 3 }),
];

describe('SprintBoard rendering', () => {
  it('renders a list of sprint cards when passed sprints', () => {
    render(<SprintBoard sprints={sprints} onReorder={jest.fn()} />);
    const cards = screen.getAllByTestId('sprint-card');
    expect(cards).toHaveLength(3);
  });

  it('renders sprint names via SprintCard', () => {
    render(<SprintBoard sprints={sprints} onReorder={jest.fn()} />);
    expect(screen.getByText('Sprint Alpha')).toBeInTheDocument();
    expect(screen.getByText('Sprint Beta')).toBeInTheDocument();
    expect(screen.getByText('Sprint Gamma')).toBeInTheDocument();
  });

  it('shows "No sprints" message when sprints array is empty', () => {
    render(<SprintBoard sprints={[]} onReorder={jest.fn()} />);
    expect(screen.getByText(/no sprints/i)).toBeInTheDocument();
  });

  it('does not render sprint cards when sprints is empty', () => {
    render(<SprintBoard sprints={[]} onReorder={jest.fn()} />);
    expect(screen.queryByTestId('sprint-card')).not.toBeInTheDocument();
  });

  it('renders a "New Sprint" button', () => {
    render(<SprintBoard sprints={sprints} onReorder={jest.fn()} />);
    expect(screen.getByRole('button', { name: /new sprint/i })).toBeInTheDocument();
  });
});

describe('SprintBoard SprintForm toggle', () => {
  it('does not show SprintForm initially', () => {
    render(<SprintBoard sprints={sprints} onReorder={jest.fn()} />);
    expect(screen.queryByTestId('sprint-form')).not.toBeInTheDocument();
  });

  it('clicking "New Sprint" shows SprintForm', async () => {
    const user = userEvent.setup();
    render(<SprintBoard sprints={sprints} onReorder={jest.fn()} />);
    await user.click(screen.getByRole('button', { name: /new sprint/i }));
    expect(screen.getByTestId('sprint-form')).toBeInTheDocument();
  });

  it('cancelling SprintForm hides the form', async () => {
    const user = userEvent.setup();
    render(<SprintBoard sprints={sprints} onReorder={jest.fn()} />);
    await user.click(screen.getByRole('button', { name: /new sprint/i }));
    await user.click(screen.getByRole('button', { name: /cancel/i }));
    expect(screen.queryByTestId('sprint-form')).not.toBeInTheDocument();
  });

  it('calls onCreateSprint with form data on submit', async () => {
    const onCreateSprint = jest.fn();
    const user = userEvent.setup();
    render(
      <SprintBoard
        sprints={sprints}
        onReorder={jest.fn()}
        onCreateSprint={onCreateSprint}
      />,
    );
    await user.click(screen.getByRole('button', { name: /new sprint/i }));
    await user.click(screen.getByRole('button', { name: /submit/i }));
    expect(onCreateSprint).toHaveBeenCalledWith({
      name: 'New Sprint',
      startDate: '2024-01-01',
      endDate: '2024-01-14',
    });
  });
});

describe('SprintBoard card selection', () => {
  it('calls onSelectSprint with the sprint id when a card is clicked', async () => {
    const onSelectSprint = jest.fn();
    const user = userEvent.setup();
    render(
      <SprintBoard
        sprints={sprints}
        onReorder={jest.fn()}
        onSelectSprint={onSelectSprint}
      />,
    );
    await user.click(screen.getByText('Sprint Alpha'));
    expect(onSelectSprint).toHaveBeenCalledWith('s1');
  });
});

describe('SprintBoard drag-and-drop reorder', () => {
  it('calls onReorder with the new order after a drop', () => {
    const onReorder = jest.fn();
    render(<SprintBoard sprints={sprints} onReorder={onReorder} />);

    const cards = screen.getAllByTestId('sprint-card');
    fireEvent.dragStart(cards[0]);
    fireEvent.dragOver(cards[1]);
    fireEvent.drop(cards[1]);

    expect(onReorder).toHaveBeenCalled();
    const [newOrder] = onReorder.mock.calls[0] as [string[]];
    expect(newOrder).toHaveLength(sprints.length);
    expect(newOrder[1]).toBe('s1');
  });
});
