import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { CreateSprintInput } from '@/components/sprint/types';
import { SprintForm } from '@/components/sprint/SprintForm';

function renderForm(
  onSubmit = jest.fn<void, [CreateSprintInput]>(),
  onCancel = jest.fn(),
) {
  render(<SprintForm onSubmit={onSubmit} onCancel={onCancel} />);
  return { onSubmit, onCancel };
}

describe('SprintForm field rendering', () => {
  it('renders the name field', () => {
    renderForm();
    expect(screen.getByRole('textbox', { name: /name/i })).toBeInTheDocument();
  });

  it('renders the startDate field', () => {
    renderForm();
    expect(screen.getByLabelText(/start date/i)).toBeInTheDocument();
  });

  it('renders the endDate field', () => {
    renderForm();
    expect(screen.getByLabelText(/end date/i)).toBeInTheDocument();
  });

  it('renders the goal field', () => {
    renderForm();
    expect(screen.getByLabelText(/goal/i)).toBeInTheDocument();
  });

  it('renders a submit button', () => {
    renderForm();
    expect(screen.getByRole('button', { name: /create|save|submit/i })).toBeInTheDocument();
  });

  it('renders a cancel button', () => {
    renderForm();
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
  });
});

describe('SprintForm submit button disabled state', () => {
  it('submit button is disabled when name is empty on initial render', () => {
    renderForm();
    expect(screen.getByRole('button', { name: /create|save|submit/i })).toBeDisabled();
  });

  it('submit button becomes enabled when name is entered', async () => {
    const user = userEvent.setup();
    renderForm();
    await user.type(screen.getByRole('textbox', { name: /name/i }), 'Sprint 1');
    expect(screen.getByRole('button', { name: /create|save|submit/i })).toBeEnabled();
  });

  it('submit button is disabled again if name is cleared', async () => {
    const user = userEvent.setup();
    renderForm();
    const nameInput = screen.getByRole('textbox', { name: /name/i });
    await user.type(nameInput, 'Sprint 1');
    await user.clear(nameInput);
    expect(screen.getByRole('button', { name: /create|save|submit/i })).toBeDisabled();
  });
});

describe('SprintForm valid submission', () => {
  it('calls onSubmit with name, startDate, and endDate', async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderForm();

    await user.type(screen.getByRole('textbox', { name: /name/i }), 'Sprint 1');
    await user.type(screen.getByLabelText(/start date/i), '2024-01-01');
    await user.type(screen.getByLabelText(/end date/i), '2024-01-14');
    await user.click(screen.getByRole('button', { name: /create|save|submit/i }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    const [data] = onSubmit.mock.calls[0] as [CreateSprintInput];
    expect(data.name).toBe('Sprint 1');
    expect(data.startDate).toBe('2024-01-01');
    expect(data.endDate).toBe('2024-01-14');
  });

  it('includes goal in submitted data when provided', async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderForm();

    await user.type(screen.getByRole('textbox', { name: /name/i }), 'Sprint 1');
    await user.type(screen.getByLabelText(/start date/i), '2024-01-01');
    await user.type(screen.getByLabelText(/end date/i), '2024-01-14');
    await user.type(screen.getByLabelText(/goal/i), 'Ship the feature');
    await user.click(screen.getByRole('button', { name: /create|save|submit/i }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    const [data] = onSubmit.mock.calls[0] as [CreateSprintInput];
    expect(data.goal).toBe('Ship the feature');
  });

  it('does not call onSubmit when name is empty', async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderForm();
    const submitBtn = screen.getByRole('button', { name: /create|save|submit/i });
    await user.click(submitBtn);
    expect(onSubmit).not.toHaveBeenCalled();
  });
});

describe('SprintForm cancel', () => {
  it('calls onCancel when Cancel is clicked', async () => {
    const user = userEvent.setup();
    const { onCancel } = renderForm();
    await user.click(screen.getByRole('button', { name: /cancel/i }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('does not call onSubmit when Cancel is clicked', async () => {
    const user = userEvent.setup();
    const { onSubmit, onCancel } = renderForm();
    await user.type(screen.getByRole('textbox', { name: /name/i }), 'Sprint X');
    await user.click(screen.getByRole('button', { name: /cancel/i }));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
