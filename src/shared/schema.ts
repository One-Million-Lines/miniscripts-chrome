import { MiniApp } from "./types";

export const MINI_APP_SCHEMA = {
  type: "object",
  required: ["id", "name", "enabled", "autoRun", "matchPatterns", "code", "createdAt", "updatedAt"],
  properties: {
    id: { type: "string", minLength: 1 },
    name: { type: "string", minLength: 1, maxLength: 100 },
    description: { type: "string", maxLength: 500 },
    version: { type: "string", pattern: "^\\d+\\.\\d+\\.\\d+$" },
    enabled: { type: "boolean" },
    autoRun: { type: "boolean" },
    matchPatterns: {
      type: "array",
      items: { type: "string", minLength: 1 },
      minItems: 1,
    },
    runAt: {
      type: "string",
      enum: ["document_idle", "document_end", "document_start", "click"],
    },
    code: { type: "string", minLength: 1 },
    icon: { type: "string" },
    createdAt: { type: "number" },
    updatedAt: { type: "number" },
  },
};

export function validateMiniApp(app: Partial<MiniApp>): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!app.id || typeof app.id !== "string") {
    errors.push("ID is required and must be a string");
  }

  if (!app.name || typeof app.name !== "string" || app.name.length === 0) {
    errors.push("Name is required");
  }

  if (app.name && app.name.length > 100) {
    errors.push("Name must be less than 100 characters");
  }

  if (typeof app.enabled !== "boolean") {
    errors.push("Enabled must be a boolean");
  }

  if (typeof app.autoRun !== "boolean") {
    errors.push("AutoRun must be a boolean");
  }

  if (!Array.isArray(app.matchPatterns) || app.matchPatterns.length === 0) {
    errors.push("Match patterns are required and must be a non-empty array");
  }

  if (!app.code || typeof app.code !== "string") {
    errors.push("Code is required and must be a string");
  }

  if (app.code && !app.code.includes("export default")) {
    errors.push("Code must export a default async function");
  }

  if (app.runAt && !["document_idle", "document_end", "document_start", "click"].includes(app.runAt)) {
    errors.push("runAt must be document_idle, document_end, document_start, or click");
  }

  if (typeof app.createdAt !== "number") {
    errors.push("createdAt must be a number");
  }

  if (typeof app.updatedAt !== "number") {
    errors.push("updatedAt must be a number");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
