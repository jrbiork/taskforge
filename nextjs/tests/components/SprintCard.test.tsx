import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Sprint } from '@/components/sprint/types';
import { SprintCard } from '@/components/sprint/SprintCard';

const makeSprint = (overrides: Partial<Sprint> = {}): Sprint => ({
  id: 'sprint-1',
  name: 'Sprint One',
  startDate: '2024-01-01',
  endDate: '2024-01-14',
  status: 'PLANNING',
  taskCount: 5,
  order: 1,
  ...overrides,
});

describe('SprintCard rendering', () => {
  it('renders the sprint name', () => {
    render(<SprintCard sprint={makeSprint()} onSelect={jest.fn()} />);
    expect(screen.getByText('Sprint One')).toBeInTheDocument();
  });

  it('renders the start date', () => {
    render(<SprintCard sprint={makeSprint()} onSelect={jest.fn()} />);
    expect(screen.getByText(/2024/)).toBeInTheDocument();
  });

  it('renders both start and end dates', () => {
    render(
      <SprintCard
        sprint={makeSprint({ startDate: '2024-01-01', endDate: '2024-01-14' })}
        onSelect={jest.fn()}
      />,
    );
    const text = document.body.textContent ?? '';
    expect(text).toMatch(/jan|01|2024/i);
  });

  it('renders the task count', () => {
    render(<SprintCard sprint={makeSprint({ taskCount: 7 })} onSelect={jest.fn()} />);
    expect(screen.getByText(/7/)).toBeInTheDocument();
  });

  it('renders a status badge', () => {
    render(<SprintCard sprint={makeSprint()} onSelect={jest.fn()} />);
    expect(screen.getByText(/planning/i)).toBeInTheDocument();
  });
});

describe('SprintCard status badge text', () => {
  it.each<[Sprint['status'], RegExp]>([
    ['PLANNING', /planning/i],
    ['ACTIVE', /active/i],
    ['COMPLETED', /completed/i],
  ])('shows correct badge text for status %s', (status, pattern) => {
    render(<SprintCard sprint={makeSprint({ status })} onSelect={jest.fn()} />);
    expect(screen.getByText(pattern)).toBeInTheDocument();
  });
});

describe('SprintCard click interaction', () => {
  it('calls onSelect with the sprint id when clicked', async () => {
    const onSelect = jest.fn();
    const user = userEvent.setup();
    render(<SprintCard sprint={makeSprint({ id: 'sprint-42' })} onSelect={onSelect} />);
    await user.click(screen.getByText('Sprint One'));
    expect(onSelect).toHaveBeenCalledWith('sprint-42');
  });

  it('calls onSelect exactly once per click', async () => {
    const onSelect = jest.fn();
    const user = userEvent.setup();
    render(<SprintCard sprint={makeSprint()} onSelect={onSelect} />);
    await user.click(screen.getByText('Sprint One'));
    expect(onSelect).toHaveBeenCalledTimes(1);
  });
});

describe('SprintCard goal display', () => {
  it('renders the goal when provided', () => {
    render(
      <SprintCard
        sprint={makeSprint({ goal: 'Ship the login flow' })}
        onSelect={jest.fn()}
      />,
    );
    expect(screen.getByText('Ship the login flow')).toBeInTheDocument();
  });

  it('does not render a goal section when goal is undefined', () => {
    render(<SprintCard sprint={makeSprint({ goal: undefined })} onSelect={jest.fn()} />);
    expect(screen.queryByText(/goal/i)).not.toBeInTheDocument();
  });
});
