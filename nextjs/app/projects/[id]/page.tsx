"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { TaskBoard } from "@/components/task-board";
import { TaskForm } from "@/components/task-form";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { ProjectWithTasks } from "@/lib/types";
import { ActivityFeed } from "@/components/activity-feed";

export default function ProjectDetailPage() {
  const params = useParams();
  const [project, setProject] = useState<ProjectWithTasks | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [activityTick, setActivityTick] = useState(0);

  useEffect(() => {
    fetchProject();
  }, [params.id]);

  const fetchProject = async () => {
    setFetchError(null);
    try {
      const response = await fetch(`/api/projects/${params.id}`);
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        setFetchError(body.error ?? "Failed to load project. Please try again.");
        return;
      }
      const data = await response.json();
      setProject(data);
    } catch {
      setFetchError("Network error — check your connection and try again.");
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return <div className="text-center py-12">Loading project...</div>;
  }

  if (fetchError) {
    return (
      <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4 text-destructive text-sm">
        {fetchError}
      </div>
    );
  }

  if (!project) {
    return <div className="text-center py-12">Project not found</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href="/projects" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Projects
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">{project.name}</h1>
            {project.description && (
              <p className="text-muted-foreground mt-1">{project.description}</p>
            )}
          </div>
          <Dialog
            open={isDialogOpen}
            onOpenChange={setIsDialogOpen}
          >
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New Task
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Task</DialogTitle>
              </DialogHeader>
              <TaskForm
                projectId={params.id as string}
                projectTasks={project.tasks}
                onSuccess={() => {
                  setIsDialogOpen(false);
                  fetchProject();
                  setActivityTick((t) => t + 1);
                }}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 items-start">
        <TaskBoard tasks={project.tasks} projectId={params.id as string} />
        <aside>
          <ActivityFeed projectId={params.id as string} refreshTrigger={activityTick} />
        </aside>
      </div>
    </div>
  );
}
