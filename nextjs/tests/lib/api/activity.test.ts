import { getProjectActivity } from "@/lib/api/activity";
import { ApiError } from "@/lib/api/tasks";

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

afterEach(() => mockFetch.mockReset());

describe("getProjectActivity", () => {
  it("calls GET /api/projects/:id/activity with Content-Type header", async () => {
    mockFetch.mockResolvedValue(ok({ events: [] }));
    await getProjectActivity("proj-1");
    expect(mockFetch).toHaveBeenCalledWith(
      "/api/projects/proj-1/activity",
      expect.objectContaining({
        headers: expect.objectContaining({ "Content-Type": "application/json" }),
      })
    );
  });

  it("URL-encodes the project id", async () => {
    mockFetch.mockResolvedValue(ok({ events: [] }));
    await getProjectActivity("proj/with spaces");
    expect(mockFetch).toHaveBeenCalledWith(
      "/api/projects/proj%2Fwith%20spaces/activity",
      expect.anything()
    );
  });

  it("returns ActivityFeedResponse with events array on success", async () => {
    const events = [{ id: "evt-1", action: "TASK_CREATED" }];
    mockFetch.mockResolvedValue(ok({ events }));
    const result = await getProjectActivity("proj-1");
    expect(result.events).toEqual(events);
  });

  it("throws ApiError with status 401 on unauthorized", async () => {
    mockFetch.mockResolvedValue(fail({ error: "Unauthorized" }, 401));
    await expect(getProjectActivity("proj-1")).rejects.toThrow(ApiError);
    await expect(getProjectActivity("proj-1")).rejects.toMatchObject({ status: 401 });
  });

  it("throws ApiError with status 404 when project not found", async () => {
    mockFetch.mockResolvedValue(fail({ error: "Project not found" }, 404));
    await expect(getProjectActivity("proj-1")).rejects.toMatchObject({
      status: 404,
      message: "Project not found",
    });
  });

  it("falls back to statusText when response body has no error field", async () => {
    mockFetch.mockResolvedValue(fail({}, 500, "Internal Server Error"));
    await expect(getProjectActivity("proj-1")).rejects.toMatchObject({
      status: 500,
      message: "Internal Server Error",
    });
  });
});
