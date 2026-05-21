import {
  getTasks,
  getTask,
  createTask,
  updateTask,
  deleteTask,
  addDependency,
  removeDependency,
  ApiError,
} from "@/lib/api/tasks";

const mockFetch = jest.fn();
global.fetch = mockFetch;

function ok(body: unknown, status = 200): Response {
  return {
    ok: true,
    status,
    statusText: "OK",
    json: () => Promise.resolve(body),
  } as unknown as Response;
}

function fail(body: unknown, status: number, statusText = "Error"): Response {
  return {
    ok: false,
    status,
    statusText,
    json: () => Promise.resolve(body),
  } as unknown as Response;
}

afterEach(() => {
  mockFetch.mockReset();
});

// ─── getTasks ────────────────────────────────────────────────────────────────

describe("getTasks", () => {
  it("calls /api/tasks with Content-Type header when no projectId", async () => {
    mockFetch.mockResolvedValue(ok([]));
    await getTasks();
    expect(mockFetch).toHaveBeenCalledWith(
      "/api/tasks",
      expect.objectContaining({
        headers: expect.objectContaining({ "Content-Type": "application/json" }),
      }),
    );
  });

  it("appends projectId as query param when provided", async () => {
    mockFetch.mockResolvedValue(ok([]));
    await getTasks("proj-abc");
    expect(mockFetch).toHaveBeenCalledWith(
      "/api/tasks?projectId=proj-abc",
      expect.anything(),
    );
  });

  it("returns parsed task array", async () => {
    const tasks = [{ id: "1", title: "Alpha" }, { id: "2", title: "Beta" }];
    mockFetch.mockResolvedValue(ok(tasks));
    const result = await getTasks();
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe("1");
  });

  it("throws ApiError with status 401 on unauthorized", async () => {
    mockFetch.mockResolvedValue(fail({ error: "Unauthorized" }, 401));
    await expect(getTasks()).rejects.toThrow(ApiError);
    await expect(getTasks()).rejects.toMatchObject({ status: 401, message: "Unauthorized" });
  });

  it("throws ApiError with status 500 on server error", async () => {
    mockFetch.mockResolvedValue(fail({ error: "Internal server error" }, 500));
    await expect(getTasks()).rejects.toMatchObject({ status: 500 });
  });
});

// ─── getTask ─────────────────────────────────────────────────────────────────

describe("getTask", () => {
  it("calls /api/tasks/:id", async () => {
    mockFetch.mockResolvedValue(ok({ id: "task-1", title: "My Task" }));
    await getTask("task-1");
    expect(mockFetch).toHaveBeenCalledWith("/api/tasks/task-1", expect.anything());
  });

  it("returns the task object", async () => {
    const task = { id: "task-1", title: "My Task", status: "TODO" };
    mockFetch.mockResolvedValue(ok(task));
    const result = await getTask("task-1");
    expect(result.id).toBe("task-1");
    expect(result.title).toBe("My Task");
  });

  it("URL-encodes the task id", async () => {
    mockFetch.mockResolvedValue(ok({ id: "a b" }));
    await getTask("a b");
    expect(mockFetch).toHaveBeenCalledWith("/api/tasks/a%20b", expect.anything());
  });

  it("throws ApiError with status 404 when task not found", async () => {
    mockFetch.mockResolvedValue(fail({ error: "Task not found" }, 404));
    await expect(getTask("missing")).rejects.toThrow(ApiError);
    await expect(getTask("missing")).rejects.toMatchObject({ status: 404, message: "Task not found" });
  });
});

// ─── createTask ──────────────────────────────────────────────────────────────

describe("createTask", () => {
  it("POSTs to /api/tasks with JSON body", async () => {
    mockFetch.mockResolvedValue(ok({ id: "new-1" }, 201));
    await createTask({ title: "New Task", projectId: "proj-1" });
    expect(mockFetch).toHaveBeenCalledWith(
      "/api/tasks",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ title: "New Task", projectId: "proj-1" }),
      }),
    );
  });

  it("includes optional fields when provided", async () => {
    mockFetch.mockResolvedValue(ok({ id: "new-2" }, 201));
    await createTask({
      title: "Task",
      projectId: "proj-1",
      description: "desc",
      priority: "HIGH",
      assigneeId: "user-1",
    });
    expect(mockFetch).toHaveBeenCalledWith(
      "/api/tasks",
      expect.objectContaining({
        body: JSON.stringify({
          title: "Task",
          projectId: "proj-1",
          description: "desc",
          priority: "HIGH",
          assigneeId: "user-1",
        }),
      }),
    );
  });

  it("returns the created task", async () => {
    const created = { id: "new-1", title: "New Task", projectId: "proj-1" };
    mockFetch.mockResolvedValue(ok(created, 201));
    const result = await createTask({ title: "New Task", projectId: "proj-1" });
    expect(result.id).toBe("new-1");
  });

  it("throws ApiError with status 400 on validation failure", async () => {
    mockFetch.mockResolvedValue(fail({ error: "Validation error" }, 400));
    await expect(createTask({ title: "", projectId: "proj-1" })).rejects.toMatchObject({
      status: 400,
      message: "Validation error",
    });
  });
});

// ─── updateTask ──────────────────────────────────────────────────────────────

describe("updateTask", () => {
  it("PATCHes /api/tasks/:id with JSON body", async () => {
    mockFetch.mockResolvedValue(ok({ id: "task-1", status: "DONE" }));
    await updateTask("task-1", { status: "DONE" });
    expect(mockFetch).toHaveBeenCalledWith(
      "/api/tasks/task-1",
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({ status: "DONE" }),
      }),
    );
  });

  it("returns the updated task", async () => {
    mockFetch.mockResolvedValue(ok({ id: "task-1", priority: "URGENT" }));
    const result = await updateTask("task-1", { priority: "URGENT" });
    expect(result.id).toBe("task-1");
  });

  it("supports partial updates with only priority", async () => {
    mockFetch.mockResolvedValue(ok({ id: "task-1" }));
    await updateTask("task-1", { priority: "LOW" });
    expect(mockFetch).toHaveBeenCalledWith(
      "/api/tasks/task-1",
      expect.objectContaining({ body: JSON.stringify({ priority: "LOW" }) }),
    );
  });

  it("throws ApiError with status 404 when task not found", async () => {
    mockFetch.mockResolvedValue(fail({ error: "Task not found" }, 404));
    await expect(updateTask("missing", { status: "DONE" })).rejects.toMatchObject({
      status: 404,
    });
  });
});

// ─── deleteTask ──────────────────────────────────────────────────────────────

describe("deleteTask", () => {
  it("sends DELETE to /api/tasks/:id", async () => {
    mockFetch.mockResolvedValue(ok({ success: true }));
    await deleteTask("task-1");
    expect(mockFetch).toHaveBeenCalledWith(
      "/api/tasks/task-1",
      expect.objectContaining({ method: "DELETE" }),
    );
  });

  it("resolves without a return value on success", async () => {
    mockFetch.mockResolvedValue(ok({ success: true }));
    await expect(deleteTask("task-1")).resolves.toBeUndefined();
  });

  it("throws ApiError with status 404 when task not found", async () => {
    mockFetch.mockResolvedValue(fail({ error: "Task not found" }, 404));
    await expect(deleteTask("missing")).rejects.toMatchObject({ status: 404 });
  });
});

// ─── addDependency ───────────────────────────────────────────────────────────

describe("addDependency", () => {
  it("POSTs to /api/tasks/:id/dependencies with dependsOnId", async () => {
    mockFetch.mockResolvedValue(ok({}));
    await addDependency("task-1", "task-2");
    expect(mockFetch).toHaveBeenCalledWith(
      "/api/tasks/task-1/dependencies",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ dependsOnId: "task-2" }),
      }),
    );
  });

  it("resolves without a return value on success", async () => {
    mockFetch.mockResolvedValue(ok({}));
    await expect(addDependency("task-1", "task-2")).resolves.toBeUndefined();
  });

  it("throws ApiError with status 400 on cycle detection", async () => {
    mockFetch.mockResolvedValue(fail({ error: "Cycle detected" }, 400));
    await expect(addDependency("task-1", "task-2")).rejects.toMatchObject({
      status: 400,
      message: "Cycle detected",
    });
  });
});

// ─── removeDependency ────────────────────────────────────────────────────────

describe("removeDependency", () => {
  it("sends DELETE to /api/tasks/:id/dependencies with dependsOnId body", async () => {
    mockFetch.mockResolvedValue(ok({}));
    await removeDependency("task-1", "task-2");
    expect(mockFetch).toHaveBeenCalledWith(
      "/api/tasks/task-1/dependencies",
      expect.objectContaining({
        method: "DELETE",
        body: JSON.stringify({ dependsOnId: "task-2" }),
      }),
    );
  });

  it("resolves without a return value on success", async () => {
    mockFetch.mockResolvedValue(ok({}));
    await expect(removeDependency("task-1", "task-2")).resolves.toBeUndefined();
  });

  it("throws ApiError on 404", async () => {
    mockFetch.mockResolvedValue(fail({ error: "Not found" }, 404));
    await expect(removeDependency("task-1", "task-2")).rejects.toMatchObject({ status: 404 });
  });
});

// ─── ApiError class ──────────────────────────────────────────────────────────

describe("ApiError", () => {
  it("exposes status and message", () => {
    const err = new ApiError(422, "Unprocessable Entity");
    expect(err.status).toBe(422);
    expect(err.message).toBe("Unprocessable Entity");
    expect(err.name).toBe("ApiError");
  });

  it("is an instance of Error", () => {
    const err = new ApiError(500, "boom");
    expect(err).toBeInstanceOf(Error);
  });

  it("falls back to statusText when response body has no error field", async () => {
    mockFetch.mockResolvedValue(
      fail({}, 503, "Service Unavailable"),
    );
    await expect(getTask("x")).rejects.toMatchObject({
      status: 503,
      message: "Service Unavailable",
    });
  });

  it("handles non-JSON error bodies without throwing", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 502,
      statusText: "Bad Gateway",
      json: () => Promise.reject(new SyntaxError("not json")),
    } as unknown as Response);
    await expect(getTask("x")).rejects.toMatchObject({
      status: 502,
      message: "Bad Gateway",
    });
  });
});
