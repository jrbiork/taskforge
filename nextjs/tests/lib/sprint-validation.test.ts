import { validateCreateSprint } from '@/lib/sprint-validation';

const valid = {
  name: 'Sprint 1',
  startDate: '2024-01-01',
  endDate: '2024-01-14',
};

function validWithOverrides(overrides: Record<string, unknown>) {
  return { ...valid, ...overrides };
}

describe('validateCreateSprint — valid inputs', () => {
  it('passes for a minimal valid input (no goal)', () => {
    const result = validateCreateSprint(valid);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('passes when goal is provided and within 500 chars', () => {
    const result = validateCreateSprint(validWithOverrides({ goal: 'Ship it' }));
    expect(result.valid).toBe(true);
  });

  it('passes when goal is exactly 500 characters', () => {
    const goal = 'a'.repeat(500);
    const result = validateCreateSprint(validWithOverrides({ goal }));
    expect(result.valid).toBe(true);
  });

  it('passes when goal is undefined', () => {
    const result = validateCreateSprint({ ...valid, goal: undefined });
    expect(result.valid).toBe(true);
  });

  it('passes when name is exactly 100 characters', () => {
    const result = validateCreateSprint(validWithOverrides({ name: 'a'.repeat(100) }));
    expect(result.valid).toBe(true);
  });
});

describe('validateCreateSprint — name validation', () => {
  it('fails when name is missing', () => {
    const { name: _omit, ...withoutName } = valid;
    const result = validateCreateSprint(withoutName as Record<string, unknown>);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => /name/i.test(e))).toBe(true);
  });

  it('fails when name is an empty string', () => {
    const result = validateCreateSprint(validWithOverrides({ name: '' }));
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => /name/i.test(e))).toBe(true);
  });

  it('fails when name is whitespace only', () => {
    const result = validateCreateSprint(validWithOverrides({ name: '   ' }));
    expect(result.valid).toBe(false);
  });

  it('fails when name exceeds 100 characters', () => {
    const result = validateCreateSprint(validWithOverrides({ name: 'a'.repeat(101) }));
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => /name/i.test(e))).toBe(true);
  });
});

describe('validateCreateSprint — date validation', () => {
  it('fails when startDate is an invalid date string', () => {
    const result = validateCreateSprint(validWithOverrides({ startDate: 'not-a-date' }));
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => /start/i.test(e))).toBe(true);
  });

  it('fails when endDate is an invalid date string', () => {
    const result = validateCreateSprint(validWithOverrides({ endDate: 'not-a-date' }));
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => /end/i.test(e))).toBe(true);
  });

  it('fails when endDate is before startDate', () => {
    const result = validateCreateSprint(
      validWithOverrides({ startDate: '2024-01-14', endDate: '2024-01-01' }),
    );
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => /end|date|before|after/i.test(e))).toBe(true);
  });

  it('fails when endDate equals startDate (not strictly after)', () => {
    const result = validateCreateSprint(
      validWithOverrides({ startDate: '2024-01-01', endDate: '2024-01-01' }),
    );
    expect(result.valid).toBe(false);
  });

  it('fails when startDate is missing', () => {
    const { startDate: _omit, ...withoutStart } = valid;
    const result = validateCreateSprint(withoutStart as Record<string, unknown>);
    expect(result.valid).toBe(false);
  });

  it('fails when endDate is missing', () => {
    const { endDate: _omit, ...withoutEnd } = valid;
    const result = validateCreateSprint(withoutEnd as Record<string, unknown>);
    expect(result.valid).toBe(false);
  });
});

describe('validateCreateSprint — goal validation', () => {
  it('fails when goal exceeds 500 characters', () => {
    const result = validateCreateSprint(validWithOverrides({ goal: 'a'.repeat(501) }));
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => /goal/i.test(e))).toBe(true);
  });
});

describe('validateCreateSprint — edge cases', () => {
  it('returns errors array when body is null', () => {
    const result = validateCreateSprint(null as unknown as Record<string, unknown>);
    expect(result.valid).toBe(false);
    expect(Array.isArray(result.errors)).toBe(true);
  });

  it('returns multiple errors when multiple fields are invalid', () => {
    const result = validateCreateSprint({ name: '', startDate: 'bad', endDate: 'bad' });
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(1);
  });
});
