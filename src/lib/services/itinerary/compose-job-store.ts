import { createHash } from "node:crypto";

import type { UserInput } from "@/types";
import type { ComposeProgressEvent, ComposeResult } from "@/lib/services/itinerary/pipeline-orchestrator";
import type {
  ComposeJobErrorPayload,
  ComposeJobProgressPayload,
  ComposeJobResponse,
  ComposeJobResultPayload,
  ComposeJobStatus,
} from "@/types/compose-job";
import type { PipelineStepId } from "@/types/itinerary-pipeline";
import { createServiceRoleClient } from "@/lib/supabase/admin";

interface ComposeJobRow {
  run_id: string;
  status: string;
  current_step: PipelineStepId | null;
  current_message: string | null;
  progress_payload: ComposeJobProgressPayload | null;
  result_payload: ComposeJobResultPayload | null;
  error_payload: ComposeJobErrorPayload | null;
}

interface CreateComposeJobInput {
  jobId: string;
  input: UserInput;
  options?: { isRetry?: boolean };
  userId?: string | null;
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function nowIso(): string {
  return new Date().toISOString();
}

export class ComposeJobStore {
  private supabase = createServiceRoleClient();

  async createJob(input: CreateComposeJobInput): Promise<{ jobId: string; accessToken: string; }> {
    const accessToken = crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");

    const { error } = await this.supabase.from("compose_runs").insert({
      run_id: input.jobId,
      user_id: input.userId ?? null,
      status: "queued",
      input_snapshot: input.input,
      progress_payload: {},
      result_payload: null,
      error_payload: null,
      access_token_hash: hashToken(accessToken),
      current_step: null,
      current_message: null,
      warnings: [],
      pipeline_version: "v3",
      started_at: nowIso(),
      last_heartbeat_at: nowIso(),
      options_snapshot: input.options ?? null,
    });

    if (error) {
      throw new Error(`Failed to create compose job: ${error.message}`);
    }

    return { jobId: input.jobId, accessToken };
  }

  async markRunning(jobId: string): Promise<void> {
    await this.updateJob(jobId, {
      status: "running",
      last_heartbeat_at: nowIso(),
    });
  }

  async appendProgress(jobId: string, event: ComposeProgressEvent): Promise<void> {
    const { data, error } = await this.supabase
      .from("compose_runs")
      .select("progress_payload")
      .eq("run_id", jobId)
      .single();

    if (error) {
      throw new Error(`Failed to load compose job progress: ${error.message}`);
    }

    const existing = (data?.progress_payload ?? {}) as ComposeJobProgressPayload;
    const nextProgress: ComposeJobProgressPayload = {
      ...existing,
    };

    if (event.type === "progress") {
      if (event.totalDays) nextProgress.totalDays = event.totalDays;
      if (event.destination) nextProgress.destination = event.destination;
      if (event.description) nextProgress.description = event.description;
      await this.updateJob(jobId, {
        status: "running",
        current_step: event.step,
        current_message: event.message,
        progress_payload: nextProgress,
        last_heartbeat_at: nowIso(),
      });
      return;
    }

    nextProgress.totalDays = event.totalDays;
    nextProgress.destination = event.destination;
    nextProgress.description = event.description;
    nextProgress.partialDays = {
      ...(nextProgress.partialDays ?? {}),
      [String(event.day)]: event.dayData,
    };

    await this.updateJob(jobId, {
      status: "running",
      current_step: event.step,
      current_message: `day_complete:${event.day}`,
      progress_payload: nextProgress,
      last_heartbeat_at: nowIso(),
    });
  }

  async markCompleted(jobId: string, result: ComposeResult): Promise<void> {
    if (!result.success || !result.itinerary) {
      throw new Error("Compose result is incomplete");
    }

    const payload: ComposeJobResultPayload = {
      itinerary: result.itinerary,
      warnings: result.warnings,
      metadata: result.metadata,
    };

    await this.updateJob(jobId, {
      status: "completed",
      current_step: null,
      current_message: null,
      result_payload: payload,
      warnings: result.warnings,
      completed_at: nowIso(),
      final_itinerary_snapshot: result.itinerary,
      last_heartbeat_at: nowIso(),
    });
  }

  async markFailed(jobId: string, result: ComposeResult): Promise<void> {
    const payload: ComposeJobErrorPayload = {
      message: result.message ?? "compose_pipeline_failed",
      failedStep: result.failedStep,
      limitExceeded: result.limitExceeded,
      userType: result.userType,
      resetAt: result.resetAt,
      remaining: result.remaining,
    };

    await this.updateJob(jobId, {
      status: "failed",
      current_step: null,
      current_message: null,
      progress_payload: {},
      error_payload: payload,
      warnings: result.warnings,
      failed_step: result.failedStep ?? null,
      error_message: payload.message,
      completed_at: nowIso(),
      last_heartbeat_at: nowIso(),
    });
  }

  async verifyAndGetJob(jobId: string, accessToken: string): Promise<ComposeJobResponse | null> {
    const { data, error } = await this.supabase
      .from("compose_runs")
      .select("run_id,status,current_step,current_message,progress_payload,result_payload,error_payload")
      .eq("run_id", jobId)
      .eq("access_token_hash", hashToken(accessToken))
      .maybeSingle<ComposeJobRow>();

    if (error) {
      throw new Error(`Failed to read compose job: ${error.message}`);
    }

    if (!data) {
      return null;
    }

    return {
      jobId: data.run_id,
      status: normalizeStatus(data.status),
      currentStep: data.current_step,
      currentMessage: data.current_message,
      progress: data.progress_payload ?? {},
      result: data.result_payload ?? undefined,
      error: data.error_payload ?? undefined,
    };
  }

  async getJobInput(jobId: string): Promise<{ input: UserInput; options?: { isRetry?: boolean } } | null> {
    const { data, error } = await this.supabase
      .from("compose_runs")
      .select("input_snapshot,options_snapshot")
      .eq("run_id", jobId)
      .maybeSingle<{ input_snapshot: UserInput | null; options_snapshot: { isRetry?: boolean } | null }>();

    if (error) {
      throw new Error(`Failed to read compose job input: ${error.message}`);
    }

    if (!data?.input_snapshot) {
      return null;
    }

    return {
      input: data.input_snapshot,
      options: data.options_snapshot ?? undefined,
    };
  }

  private async updateJob(jobId: string, patch: Record<string, unknown>): Promise<void> {
    const { error } = await this.supabase.from("compose_runs").update(patch).eq("run_id", jobId);
    if (error) {
      throw new Error(`Failed to update compose job: ${error.message}`);
    }
  }
}

function normalizeStatus(status: string): ComposeJobStatus {
  if (status === "completed" || status === "failed" || status === "queued") {
    return status;
  }
  return "running";
}
