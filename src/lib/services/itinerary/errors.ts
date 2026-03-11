/**
 * Compose Pipeline Error Classes
 * パイプラインステップごとのエラー分類
 */

export class PipelineStepError extends Error {
  public readonly step: string;
  public readonly cause?: unknown;

  constructor(step: string, message: string, cause?: unknown) {
    super(message);
    this.name = 'PipelineStepError';
    this.step = step;
    this.cause = cause;
  }
}

export class PlaceResolveError extends PipelineStepError {
  constructor(message: string, cause?: unknown) {
    super('place_resolve', message, cause);
    this.name = 'PlaceResolveError';
  }
}

export class FeasibilityError extends PipelineStepError {
  constructor(message: string, cause?: unknown) {
    super('feasibility_score', message, cause);
    this.name = 'FeasibilityError';
  }
}

export class RouteOptimizeError extends PipelineStepError {
  constructor(message: string, cause?: unknown) {
    super('route_optimize', message, cause);
    this.name = 'RouteOptimizeError';
  }
}
