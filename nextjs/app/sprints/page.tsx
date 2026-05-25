"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { SprintBoard } from "@/components/sprint/SprintBoard";
import type { Sprint } from "@/components/sprint/types";
import type { CreateSprintInput } from "@/components/sprint/types";

export default function SprintsPage() {
  const router = useRouter();
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/sprints")
      .then((r) => r.json())
      .then((data) => setSprints(data.sprints ?? []))
      .finally(() => setIsLoading(false));
  }, []);

  const handleCreateSprint = async (data: CreateSprintInput) => {
    setError(null);
    const res = await fetch("/api/sprints", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (res.ok) {
      const { sprint } = await res.json();
      setSprints((prev) => [...prev, sprint]);
    } else {
      const body = await res.json().catch(() => ({}));
      setError(body.details?.join(", ") ?? body.error ?? "Failed to create sprint");
    }
  };

  const handleReorder = (orderedIds: string[]) => {
    setSprints((prev) => {
      const map = new Map(prev.map((s) => [s.id, s]));
      return orderedIds.map((id, i) => ({ ...map.get(id)!, order: i + 1 }));
    });
  };

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading sprints…</p>;
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">Sprints</h1>
      {error && (
        <div className="mb-4 rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}
      <SprintBoard
        sprints={sprints}
        onReorder={handleReorder}
        onCreateSprint={handleCreateSprint}
        onSelectSprint={(id) => router.push(`/sprints/${id}`)}
      />
    </div>
  );
}
