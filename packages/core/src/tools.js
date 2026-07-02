export const builtinTools = [
  {
    name: "file.read",
    description: "Read local project files.",
    capability: "read",
    riskLevel: "low",
    requiresApproval: false,
    inputSchema: {
      type: "object",
      required: ["path"],
      properties: { path: { type: "string" } },
    },
    outputSchema: { type: "object" },
    metadata: { plane: "Tool And Execution" },
  },
  {
    name: "file.write",
    description: "Create or update local project files.",
    capability: "write",
    riskLevel: "medium",
    requiresApproval: true,
    inputSchema: {
      type: "object",
      required: ["path", "content"],
      properties: {
        path: { type: "string" },
        content: { type: "string" },
      },
    },
    outputSchema: { type: "object" },
    metadata: { plane: "Tool And Execution" },
  },
  {
    name: "shell.execute",
    description: "Run a shell command in a selected execution environment.",
    capability: "execute",
    riskLevel: "high",
    requiresApproval: true,
    inputSchema: {
      type: "object",
      required: ["command"],
      properties: {
        command: { type: "string" },
        cwd: { type: "string" },
      },
    },
    outputSchema: { type: "object" },
    metadata: { plane: "Tool And Execution" },
  },
  {
    name: "memory.add",
    description: "Persist a session, project, user, team, tool, or skill memory.",
    capability: "memory",
    riskLevel: "low",
    requiresApproval: false,
    inputSchema: {
      type: "object",
      required: ["content"],
      properties: {
        content: { type: "string" },
        scope: { type: "string" },
        kind: { type: "string" },
        tags: { type: "array", items: { type: "string" } },
      },
    },
    outputSchema: { type: "object" },
    metadata: { plane: "ContextOS" },
  },
  {
    name: "skill.propose",
    description: "Create a candidate skill from repeated traces.",
    capability: "skill",
    riskLevel: "medium",
    requiresApproval: true,
    inputSchema: {
      type: "object",
      required: ["name", "summary", "steps"],
      properties: {
        name: { type: "string" },
        summary: { type: "string" },
        steps: { type: "array", items: { type: "string" } },
      },
    },
    outputSchema: { type: "object" },
    metadata: { plane: "SkillForge" },
  },
];

export function listTools() {
  return builtinTools;
}

export function findTool(name) {
  return builtinTools.find((tool) => tool.name === name);
}
