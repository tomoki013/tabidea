/**
 * Plan Run Domain Types
 *
 * 設計書 (design/tabidea_plan_generation_redesign_20260404.md) に基づく
 * 新パイプラインのドメインモデル・パス契約・ランタイム型定義。
 *
 * 正本 (canonical plan) は言語非依存の構造データとして保持する。
 * AI の生テキスト・説明文は正本に直接保存しない。
 */

import type { UserInput } from './user-input';

export type BlockType =
  | 'spot'
  | 'meal'
  | 'intercity_move_placeholder'
  | 'stay_area_placeholder'
  | 'free_slot';

export type ZoneKind = 'immutable' | 'mutable';
export type MealKind = 'breakfast' | 'lunch' | 'dinner' | 'snack';
export type SpotCategory =
  | 'sightseeing'
  | 'nature'
  | 'culture'
  | 'shopping'
  | 'activity'
  | 'entertainment'
  | 'other';
export type TimeSlot = 'morning' | 'midday' | 'afternoon' | 'evening' | 'night' | 'flexible';

export interface CanonicalBlockBase {
  blockId: string;
  blockType: BlockType;
  startTime?: string;
  endTime?: string;
  durationMinutes?: number;
  placeName: string;
  searchQuery?: string;
  areaHint?: string;
  zone: ZoneKind;
  isMustVisit: boolean;
  isFixedBooking: boolean;
  rationale?: string;
}

export interface SpotBlock extends CanonicalBlockBase {
  blockType: 'spot';
  category: SpotCategory;
  timeSlot: TimeSlot;
}

export interface MealBlock extends CanonicalBlockBase {
  blockType: 'meal';
  mealKind: MealKind;
}

export interface IntercityMoveBlock extends CanonicalBlockBase {
  blockType: 'intercity_move_placeholder';
  fromCity: string;
  toCity: string;
  transportHint?: string;
}

export interface StayAreaBlock extends CanonicalBlockBase {
  blockType: 'stay_area_placeholder';
  stayArea: string;
}

export interface FreeSlotBlock extends CanonicalBlockBase {
  blockType: 'free_slot';
  label?: string;
}

export type CanonicalBlock =
  | SpotBlock
  | MealBlock
  | IntercityMoveBlock
  | StayAreaBlock
  | FreeSlotBlock;

export interface CanonicalDay {
  dayNumber: number;
  title: string;
  mainArea: string;
  overnightLocation: string;
  blocks: CanonicalBlock[];
  summary?: string;
}

export interface CanonicalCity {
  cityId: string;
  cityName: string;
  cityOrder: number;
  days: CanonicalDay[];
}

export interface CanonicalTrip {
  tripId: string;
  version: number;
  title: string;
  primaryDestination: string;
  destinations: string[];
  durationDays: number;
  startDate?: string;
  endDate?: string;
  cities: CanonicalCity[];
  planRunId: string;
  userId?: string;
  accessToken?: string;
  createdAt: string;
  updatedAt: string;
}

export type PlanRunState =
  | 'created'
  | 'running'
  | 'paused'
  | 'completed'
  | 'failed';

export const PLAN_RUN_VALID_TRANSITIONS: Record<PlanRunState, readonly PlanRunState[]> = {
  created: ['running', 'paused', 'failed'],
  running: ['running', 'paused', 'completed', 'failed'],
  paused: ['running', 'completed', 'failed'],
  completed: [],
  failed: [],
} as const;

export type PlanRunLegacyCheckpointState =
  | 'request_normalized'
  | 'frame_built'
  | 'draft_generated'
  | 'draft_validated'
  | 'draft_repaired'
  | 'timeline_finalized'
  | 'gate_passed';

export type PlanRunPassId =
  | 'normalize_request'
  | 'plan_frame_build'
  | 'draft_generate'
  | 'draft_validate'
  | 'draft_repair_local'
  | 'timeline_finalize'
  | 'completion_gate'
  | 'persist_completed_trip';

export type PlanRunPassOutcome =
  | 'completed'
  | 'partial'
  | 'failed_terminal';

export type PlanRunPauseReason =
  | 'runtime_budget_exhausted'
  | 'day_unit_boundary'
  | 'infrastructure_interrupted';

export interface PlanFrame {
  primaryDestination: string;
  title: string;
  destinations: string[];
  durationDays: number;
  cities: PlanFrameCity[];
}

export interface PlanFrameCity {
  cityId: string;
  cityName: string;
  cityOrder: number;
  days: PlanFrameDay[];
}

export interface PlanFrameDay {
  dayNumber: number;
  mainArea: string;
  overnightLocation: string;
  dayKind: 'arrival' | 'full' | 'departure' | 'transit';
}

export interface DraftTrip {
  primaryDestination: string;
  title: string;
  cities: DraftCity[];
}

export interface DraftCity {
  cityId: string;
  cityName: string;
  cityOrder: number;
  days: DraftDay[];
}

export interface DraftDay {
  dayNumber: number;
  title: string;
  mainArea: string;
  overnightLocation: string;
  summary?: string;
  blocks: DraftBlock[];
}

export interface DraftBlock {
  draftId: string;
  blockType: BlockType;
  placeName: string;
  searchQuery?: string;
  areaHint?: string;
  startTime?: string;
  endTime?: string;
  durationMinutes?: number;
  timeSlot?: TimeSlot;
  category?: SpotCategory;
  mealKind?: MealKind;
  fromCity?: string;
  toCity?: string;
  transportHint?: string;
  stayArea?: string;
  isMustVisit: boolean;
  isFixedBooking: boolean;
  rationale?: string;
}

export type ValidationSeverity = 'error' | 'warning';

export interface ValidationIssue {
  severity: ValidationSeverity;
  code: string;
  message: string;
  dayNumber?: number;
  draftId?: string;
  repairable: boolean;
}

export interface DraftValidationResult {
  valid: boolean;
  issues: ValidationIssue[];
  hardFail: boolean;
  repairTargetDays: number[];
}

export interface RepairRecord {
  iteration: number;
  targetDayNumber?: number;
  targetDraftId?: string;
  issueCode: string;
  result: 'fixed' | 'unresolved';
  durationMs: number;
  timestamp: string;
}

export interface TimelineDay {
  dayNumber: number;
  title: string;
  mainArea: string;
  overnightLocation: string;
  startTime: string;
  blocks: TimelineBlock[];
}

export interface TimelineBlock {
  draftId: string;
  blockType: BlockType;
  placeName: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  travelToNextMinutes?: number;
  warnings: string[];
}

export interface PlanRunExecution {
  status: 'idle' | 'running';
  leaseExpiresAt?: string;
  sliceId?: string;
}

export interface PlanRunResumeHint {
  mode: 'auto' | 'manual' | 'none';
  reason?: string;
  retryAfterMs?: number;
}

export interface PlanRun {
  id: string;
  userId?: string;
  accessToken?: string;
  state: PlanRunState;
  stateVersion: number;
  idempotencyKey?: string;
  inputHash?: string;
  inputSnapshot?: UserInput;
  modelName?: string;
  normalizedInput?: NormalizedPlanRunRequest;
  planFrame?: PlanFrame;
  draftTrip?: DraftTrip;
  validationResult?: DraftValidationResult;
  repairHistory: RepairRecord[];
  timeline?: TimelineDay[];
  gatePassedAt?: string;
  completedTripId?: string;
  completedTripVersion?: number;
  pauseContext?: PlanRunPauseContext;
  currentPassId?: PlanRunPassId;
  lastCompletedPassId?: PlanRunPassId;
  failureContext?: PlanRunFailureContext;
  runtimeProfile?: string;
  warnings: string[];
  execution: PlanRunExecution;
  resumeHint: PlanRunResumeHint;
  createdAt: string;
  updatedAt: string;
}

export interface PlanRunPauseContext {
  pauseReason: PlanRunPauseReason;
  resumePassId: PlanRunPassId;
  nextDayNumber?: number;
  pausedAt: string;
  dayRetryMap?: Record<string, number>;
}

export interface NormalizedPlanRunRequest {
  destinations: string[];
  durationDays: number;
  startDate?: string;
  companions: string;
  themes: string[];
  budgetLevel: 'budget' | 'standard' | 'premium' | 'luxury';
  pace: 'relaxed' | 'balanced' | 'active';
  mustVisitPlaces: string[];
  fixedTransports: FixedTransport[];
  fixedHotels: FixedHotel[];
  freeText: string;
  preferredTransport: string[];
  homeBaseCity?: string;
  outputLanguage: string;
  hardConstraints: string[];
  softPreferences: string[];
}

export interface FixedTransport {
  type: 'flight' | 'train' | 'bus' | 'other';
  name: string;
  date?: string;
  time?: string;
  from?: string;
  to?: string;
  notes?: string;
  dayNumber?: number;
}

export interface FixedHotel {
  name: string;
  checkInDate?: string;
  checkOutDate?: string;
  notes?: string;
  startDay?: number;
  endDay?: number;
}

export interface PlanRunPassBudget {
  maxExecutionMs: number;
  deadlineAt: number;
  remainingMs: () => number;
}

export interface PlanRunPassContext {
  run: PlanRun;
  budget: PlanRunPassBudget;
}

export interface PlanRunPassResult<T = unknown> {
  outcome: PlanRunPassOutcome;
  data?: T;
  newState: PlanRunState | PlanRunLegacyCheckpointState;
  warnings: string[];
  durationMs: number;
  pauseContext?: PlanRunPauseContext;
  metadata?: Record<string, unknown>;
}

export interface PlanRunFailureContext {
  passId?: PlanRunPassId;
  errorCode: string;
  message: string;
  rootCause?: string;
  invalidFieldPath?: string;
  retryable: boolean;
  occurredAt: string;
}

export interface PlanRunSliceRecord {
  runId: string;
  sliceId: string;
  fromState: PlanRunState;
  toState: PlanRunState;
  currentPassId?: PlanRunPassId;
  stopReason: 'completed' | 'paused' | 'failed';
  errorCode?: string;
  rootCause?: string;
  startedAt: string;
  finishedAt: string;
  leaseToken: string;
  budgetMs: number;
  metadata?: Record<string, unknown>;
}

export type PlanRunEventType =
  | 'run.started'
  | 'run.progress'
  | 'run.paused'
  | 'run.completed'
  | 'run.failed';

export interface PlanRunProgressEvent {
  type: 'run.progress';
  passId: PlanRunPassId;
  state: PlanRunState;
  message: string;
}

export interface PlanRunCompletedEvent {
  type: 'run.completed';
  tripId: string;
  tripVersion: number;
}

export interface PlanRunFailedEvent {
  type: 'run.failed';
  passId?: PlanRunPassId;
  errorCode: string;
  message: string;
  rootCause?: string;
  invalidFieldPath?: string;
  retryable: boolean;
}

export interface PlanRunPausedEvent {
  type: 'run.paused';
  resumePassId: PlanRunPassId;
  pauseReason: PlanRunPauseReason;
}

export type PlanRunEvent =
  | PlanRunProgressEvent
  | PlanRunCompletedEvent
  | PlanRunFailedEvent
  | PlanRunPausedEvent;
