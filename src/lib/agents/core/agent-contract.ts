/**
 * @file src/lib/agents/core/agent-contract.ts
 *
 * Core agent contract, execution status, and base result container.
 */

export type AgentStatus = "idle" | "running" | "success" | "partial" | "failed";

export interface AgentResult<T> {
  agentName: string;
  status: AgentStatus;
  data: T | null;
  reasoning: string;
  warnings: string[];
  sourceReferences: string[];
  startedAt: string;
  completedAt: string;
  durationMs: number;
  errorCategory?: string;
}
