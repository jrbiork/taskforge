import type { CreateSprintInput } from '@/components/sprint/types';

beforeEach(() => {
  jest.resetModules();
});

const baseInput: CreateSprintInput = {
  name: 'Sprint 1',
  startDate: '2024-01-01',
  endDate: '2024-01-14',
};

describe('getAllSprints', () => {
  it('returns an empty array initially', async () => {
    const { getAllSprints: fresh } = await import('@/lib/sprint-db');
    const result = await fresh();
    expect(result).toEqual([]);
  });

  it('returns sprints sorted by order ascending', async () => {
    const { getAllSprints: fresh, createSprint: freshCreate } = await import('@/lib/sprint-db');
    await freshCreate({ name: 'Sprint A', startDate: '2024-01-01', endDate: '2024-01-07' });
    await freshCreate({ name: 'Sprint B', startDate: '2024-01-08', endDate: '2024-01-14' });
    await freshCreate({ name: 'Sprint C', startDate: '2024-01-15', endDate: '2024-01-21' });

    const sprints = await fresh();
    expect(sprints[0].order).toBeLessThan(sprints[1].order);
    expect(sprints[1].order).toBeLessThan(sprints[2].order);
  });

  it('returns all created sprints', async () => {
    const { getAllSprints: fresh, createSprint: freshCreate } = await import('@/lib/sprint-db');
    await freshCreate({ name: 'Sprint A', startDate: '2024-01-01', endDate: '2024-01-07' });
    await freshCreate({ name: 'Sprint B', startDate: '2024-01-08', endDate: '2024-01-14' });

    const sprints = await fresh();
    expect(sprints).toHaveLength(2);
  });
});

describe('createSprint — returned shape', () => {
  it('returns a sprint with an id', async () => {
    const { createSprint: fresh } = await import('@/lib/sprint-db');
    const sprint = await fresh(baseInput);
    expect(typeof sprint.id).toBe('string');
    expect(sprint.id.length).toBeGreaterThan(0);
  });

  it('returns a sprint with status PLANNING', async () => {
    const { createSprint: fresh } = await import('@/lib/sprint-db');
    const sprint = await fresh(baseInput);
    expect(sprint.status).toBe('PLANNING');
  });

  it('returns a sprint with taskCount 0', async () => {
    const { createSprint: fresh } = await import('@/lib/sprint-db');
    const sprint = await fresh(baseInput);
    expect(sprint.taskCount).toBe(0);
  });

  it('returns a sprint with the correct name', async () => {
    const { createSprint: fresh } = await import('@/lib/sprint-db');
    const sprint = await fresh(baseInput);
    expect(sprint.name).toBe(baseInput.name);
  });

  it('returns a sprint with the correct startDate', async () => {
    const { createSprint: fresh } = await import('@/lib/sprint-db');
    const sprint = await fresh(baseInput);
    expect(sprint.startDate).toBe(baseInput.startDate);
  });

  it('returns a sprint with the correct endDate', async () => {
    const { createSprint: fresh } = await import('@/lib/sprint-db');
    const sprint = await fresh(baseInput);
    expect(sprint.endDate).toBe(baseInput.endDate);
  });

  it('returns a sprint with a createdAt string', async () => {
    const { createSprint: fresh } = await import('@/lib/sprint-db');
    const sprint = await fresh(baseInput);
    expect(typeof sprint.createdAt).toBe('string');
    expect(() => new Date(sprint.createdAt)).not.toThrow();
  });

  it('returns a sprint without a goal when not provided', async () => {
    const { createSprint: fresh } = await import('@/lib/sprint-db');
    const sprint = await fresh(baseInput);
    expect(sprint.goal).toBeUndefined();
  });

  it('returns a sprint with the provided goal', async () => {
    const { createSprint: fresh } = await import('@/lib/sprint-db');
    const sprint = await fresh({ ...baseInput, goal: 'Ship auth flow' });
    expect(sprint.goal).toBe('Ship auth flow');
  });
});

describe('createSprint — order assignment', () => {
  it('assigns order 1 to the first sprint', async () => {
    const { createSprint: fresh } = await import('@/lib/sprint-db');
    const sprint = await fresh(baseInput);
    expect(sprint.order).toBe(1);
  });

  it('assigns order 2 to the second sprint', async () => {
    const { createSprint: fresh } = await import('@/lib/sprint-db');
    await fresh({ name: 'First', startDate: '2024-01-01', endDate: '2024-01-07' });
    const second = await fresh({ name: 'Second', startDate: '2024-01-08', endDate: '2024-01-14' });
    expect(second.order).toBe(2);
  });

  it('increments order for each subsequent sprint', async () => {
    const { createSprint: fresh } = await import('@/lib/sprint-db');
    const s1 = await fresh({ name: 'S1', startDate: '2024-01-01', endDate: '2024-01-07' });
    const s2 = await fresh({ name: 'S2', startDate: '2024-01-08', endDate: '2024-01-14' });
    const s3 = await fresh({ name: 'S3', startDate: '2024-01-15', endDate: '2024-01-21' });
    expect(s1.order).toBe(1);
    expect(s2.order).toBe(2);
    expect(s3.order).toBe(3);
  });
});

describe('createSprint + getAllSprints round-trip', () => {
  it('getAllSprints includes the sprint created by createSprint', async () => {
    const { createSprint: fresh, getAllSprints: freshGet } = await import('@/lib/sprint-db');
    const created = await fresh(baseInput);
    const all = await freshGet();
    expect(all.find((s) => s.id === created.id)).toBeDefined();
  });
});
