import { User, Project, Task, Comment, Label, Notification, TaskDependency, ActivityEvent } from "@prisma/client";

export type { User, Project, Task, Comment, Label, Notification, TaskDependency, ActivityEvent };

export type Role = "ADMIN" | "MEMBER" | "VIEWER";
export type ProjectStatus = "ACTIVE" | "ARCHIVED";
export type TaskStatus = "TODO" | "IN_PROGRESS" | "DONE";
export type Priority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";
export type SortBy = "default" | "priority";
export type NotificationType = "TASK_ASSIGNED" | "TASK_COMPLETED" | "MENTION";

export type DependencyWithPrerequisite = TaskDependency & {
  dependsOn: Pick<Task, "id" | "title" | "status">;
};

export type DependentWithTask = TaskDependency & {
  task: Pick<Task, "id" | "title" | "status">;
};

export type TaskWithDetails = Task & {
  assignee: Pick<User, "id" | "name" | "email"> | null;
  project: Pick<Project, "id" | "name">;
  comments: (Comment & { author: Pick<User, "id" | "name" | "email"> })[];
  dependencies: DependencyWithPrerequisite[];
  dependents: DependentWithTask[];
};

export type TaskForBoard = Task & {
  assignee: Pick<User, "id" | "name" | "email"> | null;
  dependencies: DependencyWithPrerequisite[];
};

export type ProjectWithTasks = Project & {
  tasks: TaskForBoard[];
  owner: Pick<User, "id" | "name" | "email">;
};

export type NotificationItem = Notification & {
  task?: { id: string; title: string } | null;
};

export type ActivityAction =
  | "TASK_CREATED"
  | "TASK_UPDATED"
  | "TASK_STATUS_CHANGED"
  | "TASK_ASSIGNED"
  | "TASK_DELETED"
  | "COMMENT_ADDED"
  | "PROJECT_UPDATED";

export type ActivityEntityType = "TASK" | "COMMENT" | "PROJECT";

export type TaskStatusChangedMetadata = { oldStatus: string; newStatus: string; taskTitle: string };
export type TaskAssignedMetadata = { assigneeName: string | null; taskTitle: string };
export type TaskCreatedMetadata = { taskTitle: string };
export type TaskDeletedMetadata = { taskTitle: string };
export type CommentAddedMetadata = { taskTitle: string; commentPreview: string };
export type TaskUpdatedMetadata = { taskTitle: string; changedFields: string[] };
export type ProjectUpdatedMetadata = { changedFields: string[] };

export type ActivityMetadata =
  | TaskStatusChangedMetadata
  | TaskAssignedMetadata
  | TaskCreatedMetadata
  | TaskUpdatedMetadata
  | TaskDeletedMetadata
  | CommentAddedMetadata
  | ProjectUpdatedMetadata;

export type ActivityEventItem = ActivityEvent & {
  actor: Pick<User, "id" | "name" | "email">;
};

export interface ActivityFeedResponse {
  events: ActivityEventItem[];
}
