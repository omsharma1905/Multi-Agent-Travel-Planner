/**
 * @file src/lib/agents/core/observability.ts
 *
 * Observability tracker for logging agent runs and timings.
 */

import { AgentStatus } from "./agent-contract";

export interface AgentRunRecord {
  id: string;
  tripId: string;
  agentName: string;
  status: AgentStatus;
  attempt: number;
  durationMs: number;
  error?: string;
  errorCategory?: string;
  inputSummary?: string;
  outputSummary?: string;
  createdAt: string;
}

declare global {
  var __agentRunRecords: AgentRunRecord[] | undefined;
}

const memoryRuns = (global.__agentRunRecords ??= []);

export const AgentObservability = {
  recordRun(record: Omit<AgentRunRecord, "id" | "createdAt">): AgentRunRecord {
    const fullRecord: AgentRunRecord = {
      ...record,
      id: `run_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      createdAt: new Date().toISOString(),
    };
    memoryRuns.push(fullRecord);
    return fullRecord;
  },

  getRunsForTrip(tripId: string): AgentRunRecord[] {
    return memoryRuns.filter((r) => r.tripId === tripId);
  },

  clear(): void {
    memoryRuns.length = 0;
  },
};
