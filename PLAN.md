# pi-board Implementation Plan

## Overview
This plan fills gaps in AI tooling, core task features, UI/UX, reporting, and advanced capabilities. Each phase builds on the previous one and is designed to be releasable independently.

---

## Phase 1: Missing AI Tools (Backend Already Supports)
**Goal:** Close the gap between what the backend/API can do and what AI tools expose.

- [ ] **1.1 `board_delete_sprint`** — Delete a sprint by ID (fails if tasks are assigned).
- [ ] **1.2 `board_get_sprint`** — Get single sprint details by ID.
- [ ] **1.3 `board_update_label`** — Rename or recolor a label by ID.
- [ ] **1.4 `board_delete_label`** — Remove a label by ID.
- [ ] **1.5 `board_update_person`** — Rename or recolor a person by ID.
- [ ] **1.6 `board_delete_person`** — Remove a person by ID (unassigns their tasks).
- [ ] **1.7 `board_create_task` auto-assign active sprint** — Fix: if `sprintId` is omitted, automatically assign the active sprint (currently leaves `sprint_id` null despite docs saying otherwise).
- [ ] **1.8 `board_list_tasks` expanded filters** — Add `assigneeId` and `labelIds` filter parameters to the tool schema.

---

## Phase 2: Core Task Features
**Goal:** Make tasks richer and more useful for real sprint management.

- [ ] **2.1 Task due dates** — Add `due_date` column to tasks, expose in create/update/get/list tools and UI modal.
- [ ] **2.2 Story points / estimate** — Add `estimate` integer column (e.g., Fibonacci 1-100), expose everywhere.
- [ ] **2.3 Search descriptions** — Extend `search` in `listTasks` to match both `title` and `description`.
- [ ] **2.4 Task dependencies / blockers** — New `task_dependencies` table (`task_id`, `depends_on_task_id`).
  - Prevent circular dependencies.
  - Show blocked/blocked-by badges in UI and AI `get_task` output.
- [ ] **2.5 Subtasks / checklist** — New `subtasks` table (`id`, `task_id`, `title`, `completed`, `order`).
  - Render as checklist inside task detail modal.
  - AI tools: `board_add_subtask`, `board_toggle_subtask`, `board_delete_subtask`.
- [ ] **2.6 Task duplication** — New AI tool `board_duplicate_task` and UI "Duplicate" button in task modal.
- [ ] **2.7 Archive / hide completed** — Add `archived` boolean to tasks.
  - "Archive sprint" button moves all its completed tasks to archived state.
  - Add "Show archived" toggle in UI (default off).

---

## Phase 3: UI/UX & Board Polish
**Goal:** Make the web board faster, more accessible, and mobile-friendly.

- [ ] **3.1 Filter by assignee and label** — Add dropdown filters in header next to sprint filter.
- [ ] **3.2 "Active sprint only" quick toggle** — One-click filter to show only the active sprint.
- [ ] **3.3 Keyboard shortcuts** — `N` new task, `Esc` close modal, `E` edit open task, `?` shortcut help overlay, `D` delete task (with confirm).
- [ ] **3.4 Mobile drag-and-drop** — Implement touch-based DnD (e.g., long-press to pick up, tap column to drop) or move-via-menu fallback.
- [ ] **3.5 WIP limits** — Add optional `wip_limit` integer per column (stored in new `column_settings` table or config).
  - Visual warning when limit exceeded (yellow/red header).
- [ ] **3.6 Swimlanes** — Toggle to group board rows by assignee or priority.
- [ ] **3.7 Markdown rendering** — Render `description` as sanitized Markdown in task view modal.
- [ ] **3.8 Column collapse** — Allow collapsing individual columns to save space.

---

## Phase 4: Data, Reporting & Export
**Goal:** Give teams visibility into progress and a path out of the SQLite lock-in.

- [ ] **4.1 Sprint statistics endpoint** — `/api/sprints/:id/stats` returning:
  - Total tasks, completed tasks, completion %.
  - Sum of story points (total vs completed).
  - Average cycle time (first in-progress → completed).
- [ ] **4.2 Burndown chart** — New tab/modal with a Chart.js (or lightweight canvas) burndown for active sprint.
- [ ] **4.3 Assignee workload view** — New modal/table showing task count and total points per person.
- [ ] **4.4 Activity / audit log** — New `activity_log` table (`task_id`, `user`, `action`, `old_value`, `new_value`, `created_at`).
  - Log all create/update/move/delete operations.
  - Show timeline in task modal.
- [ ] **4.5 Export to JSON** — AI tool and UI button to dump all tasks, sprints, labels, people to JSON.
- [ ] **4.6 Export to CSV** — Export current filtered task list to CSV for spreadsheets.
- [ ] **4.7 Import from JSON** — Restore a previously exported JSON backup.

---

## Phase 5: Advanced Features
**Goal:** Power-user capabilities for larger teams or longer-running projects.

- [ ] **5.1 Custom statuses / columns** — Replace hardcoded `STATUSES` with user-configurable columns.
  - New `columns` table: `id`, `name`, `color`, `wip_limit`, `order`.
  - Migrate existing tasks to new system with default columns.
- [ ] **5.2 Time tracking** — Add `time_spent` (minutes) and `time_estimated` (minutes) to tasks.
  - Simple timer UI (start/stop) in task modal.
- [ ] **5.3 Comments on tasks** — New `comments` table (`task_id`, `author`, `body`, `created_at`).
- [ ] **5.4 Recurring tasks** — Add `recurring_rule` JSON to tasks (e.g., `{ "frequency": "weekly", "day": "Monday" }`).
  - Background job or check-on-refresh to auto-spawn next instance.
- [ ] **5.5 Notifications** — Toast warnings for:
  - Overdue tasks (checked on board load).
  - WIP limit exceeded.
- [ ] **5.6 Multi-assignee** — Change `assignee_id` to many-to-many `task_assignees`.
  - Update chips, filters, and AI tools accordingly.

---

## Suggested Priority Order (if doing sequentially)

1. **Phase 1** — Zero-risk parity fixes; immediately improves AI experience.
2. **Phase 2.1–2.3** — Due dates, estimates, and description search are universally useful.
3. **Phase 3.1–3.3** — Filters and keyboard shortcuts make the UI significantly faster.
4. **Phase 2.4–2.5** — Dependencies and subtasks unlock complex project tracking.
5. **Phase 4.1–4.3** — Reporting gives managers/teams value from accumulated data.
6. **Phase 3.4–3.7** — Mobile, WIP limits, swimlanes, and Markdown polish the UX.
7. **Phase 4.4–4.7** — Audit trail and export reduce risk and enable backups.
8. **Phase 2.6–2.7** — Duplication and archiving are nice quality-of-life additions.
9. **Phase 5.x** — Major schema changes; only tackle when core product is stable.

---

## Notes
- All database changes should use additive migrations (new columns default to NULL / sensible defaults) to avoid breaking existing `.pi/board.db` files.
- Keep the "no remote services" constraint: no external APIs, no cloud sync.
- AI tools should remain backward-compatible: new parameters are `Type.Optional()`.
