const { exec } = require("child_process");
const { createTask, updateTask, listTasks, getTask, deleteTask } = require("./lib/board");
const { start } = require("./server");

module.exports = async function (pi) {
  const { Type } = await import("typebox");

  const StatusType = Type.Union([
    Type.Literal("backlog"),
    Type.Literal("in-progress"),
    Type.Literal("code-review"),
    Type.Literal("uat"),
    Type.Literal("completed"),
  ]);

  pi.registerTool({
    name: "board_create_task",
    label: "Create Task",
    description: "Create a new task on the board",
    parameters: Type.Object({
      title: Type.String({ description: "Task title" }),
      description: Type.Optional(Type.String({ description: "Task description" })),
      sprint: Type.Optional(Type.String({ description: "Sprint name or number" })),
      status: Type.Optional(StatusType),
      assignee: Type.Optional(Type.String({ description: "Person assigned to the task" })),
    }),
    async execute(toolCallId, params, signal, onUpdate, ctx) {
      const task = createTask(params);
      return {
        content: [{ type: "text", text: `Created task ${task.id}: ${task.title} (${task.status})` }],
        details: { task },
      };
    },
  });

  pi.registerTool({
    name: "board_update_task",
    label: "Update Task",
    description: "Update an existing task by ID",
    parameters: Type.Object({
      id: Type.String({ description: "Task ID" }),
      title: Type.Optional(Type.String()),
      description: Type.Optional(Type.String()),
      sprint: Type.Optional(Type.String()),
      status: Type.Optional(StatusType),
      assignee: Type.Optional(Type.String()),
    }),
    async execute(toolCallId, params, signal, onUpdate, ctx) {
      const { id, ...updates } = params;
      const task = updateTask(id, updates);
      return {
        content: [{ type: "text", text: `Updated task ${task.id}: ${task.title} (${task.status})` }],
        details: { task },
      };
    },
  });

  pi.registerTool({
    name: "board_list_tasks",
    label: "List Tasks",
    description: "List all tasks, optionally filtered by sprint and/or status",
    parameters: Type.Object({
      sprint: Type.Optional(Type.String({ description: "Filter by sprint name" })),
      status: Type.Optional(StatusType),
    }),
    async execute(toolCallId, params, signal, onUpdate, ctx) {
      const tasks = listTasks(params);
      if (tasks.length === 0) {
        return { content: [{ type: "text", text: "No tasks found." }] };
      }
      const lines = tasks.map(t => `- ${t.id}: ${t.title} [${t.status}]${t.assignee ? ' (' + t.assignee + ')' : ''} (sprint: ${t.sprint})`);
      return {
        content: [{ type: "text", text: `Tasks (${tasks.length}):\n${lines.join('\n')}` }],
        details: { tasks },
      };
    },
  });

  pi.registerTool({
    name: "board_get_task",
    label: "Get Task",
    description: "Get a single task by ID",
    parameters: Type.Object({
      id: Type.String({ description: "Task ID" }),
    }),
    async execute(toolCallId, params, signal, onUpdate, ctx) {
      const task = getTask(params.id);
      if (!task) {
        return { content: [{ type: "text", text: `Task not found: ${params.id}` }] };
      }
      return {
        content: [{ type: "text", text: `Task ${task.id}:\nTitle: ${task.title}\nDescription: ${task.description || '(none)'}\nStatus: ${task.status}\nSprint: ${task.sprint}\nAssignee: ${task.assignee || 'unassigned'}\nCreated: ${task.createdAt}\nUpdated: ${task.updatedAt}` }],
        details: { task },
      };
    },
  });

  pi.registerTool({
    name: "board_delete_task",
    label: "Delete Task",
    description: "Delete a task by ID",
    parameters: Type.Object({
      id: Type.String({ description: "Task ID" }),
    }),
    async execute(toolCallId, params, signal, onUpdate, ctx) {
      const task = deleteTask(params.id);
      return {
        content: [{ type: "text", text: `Deleted task ${task.id}: ${task.title}` }],
        details: { task },
      };
    },
  });

  pi.registerCommand("board", {
    description: "Open the Kanban board web UI in your browser",
    handler: async (args, ctx) => {
      const PORT = process.env.PI_BOARD_PORT || 3333;
      const result = start(PORT);
      if (result.alreadyRunning) {
        ctx.ui.notify(`Server already running at http://localhost:${PORT}`, "info");
      } else {
        ctx.ui.notify(`Started pi-board server at http://localhost:${PORT}`, "info");
      }
      const url = `http://localhost:${PORT}`;
      const cmd = process.platform === "darwin" ? `open ${url}` :
                  process.platform === "win32" ? `start ${url}` :
                  `xdg-open ${url}`;
      exec(cmd, (error) => {
        if (error) {
          ctx.ui.notify(`Board is running at ${url}`, "info");
        }
      });
    },
  });
};
