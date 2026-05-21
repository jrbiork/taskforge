import { detectCircularDependency } from "@/lib/detect-cycle";

describe("detectCircularDependency", () => {
  it("returns true for self-dependency", () => {
    expect(detectCircularDependency({}, "A", "A")).toBe(true);
  });

  it("returns false for two unrelated tasks", () => {
    expect(detectCircularDependency({}, "A", "B")).toBe(false);
  });

  it("returns false for a simple non-cyclic chain", () => {
    const graph = { B: ["C"], C: [] };
    expect(detectCircularDependency(graph, "A", "B")).toBe(false);
  });

  it("detects a direct cycle: B already depends on A, adding A→B", () => {
    const graph = { B: ["A"] };
    expect(detectCircularDependency(graph, "A", "B")).toBe(true);
  });

  it("detects a cycle when adding A→B and graph has B→C→A", () => {
    const graph = { B: ["C"], C: ["A"] };
    expect(detectCircularDependency(graph, "A", "B")).toBe(true);
  });

  it("handles missing keys in graph gracefully", () => {
    expect(detectCircularDependency({}, "A", "B")).toBe(false);
  });

  it("does not falsely flag a diamond DAG", () => {
    // A → B, A → C, B → D, C → D — adding E → A is fine
    const graph = { A: ["B", "C"], B: ["D"], C: ["D"], D: [] };
    expect(detectCircularDependency(graph, "E", "A")).toBe(false);
  });

  it("visits shared nodes only once in a diamond", () => {
    // Reachability from A: B, C, D — D appears via two paths
    const graph = { A: ["B", "C"], B: ["D"], C: ["D"], D: [] };
    // X → A should not cause D to be processed twice (tested via correctness, no infinite loop)
    expect(detectCircularDependency(graph, "X", "A")).toBe(false);
  });

  it("returns true when taskId appears deep in the graph", () => {
    const graph = { B: ["C"], C: ["D"], D: ["A"] };
    expect(detectCircularDependency(graph, "A", "B")).toBe(true);
  });
});
