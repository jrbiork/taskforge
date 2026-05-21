---
name: hook-testing-conventions
description: Patterns for testing React hooks with Jest + React Testing Library in this project
metadata:
  type: project
---

## File location
Hook tests live at `nextjs/tests/lib/hooks/<hook-name>.test.ts`.

## Mock placement
`jest.mock(...)` calls must appear **before** all `import` statements — the module factory hoisting requirement.

## Fake timers
Use `jest.useFakeTimers()` in `beforeEach` and `jest.useRealTimers()` in `afterEach` for hooks that use `setInterval` or `setTimeout`.

## document.hidden simulation
```ts
Object.defineProperty(document, "hidden", { configurable: true, value: true });
```
Always pass `configurable: true` so it can be redefined across tests.

## act() + async
When calling an imperative function from the hook (e.g., `refetch()`), wrap in `act(async () => { await result.current.refetch(); })`.

## waitFor pattern
Use `waitFor(() => expect(...))` after async side effects settle.

## Coverage gaps to always check for hooks
- Returned callback functions (e.g., `refetch`) called explicitly
- State after multiple successive fetches (replace vs append)
- Error cleared on successful retry (`setError(null)` at start of fetch)
- Loading NOT reset to `true` on subsequent fetches (only initial)
- Interval fires multiple times (not just once)
- Cleanup: interval cleared on unmount (no polls after unmount)
- Event listener NOT invoked when condition is false (e.g., `hidden: true` on visibilitychange)
- Initial state snapshot (loading=true, events=[], error=null) before fetch resolves
