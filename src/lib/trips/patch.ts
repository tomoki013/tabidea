import type { Itinerary } from '@/types/itinerary';
import { synchronizeItineraryStructures } from './sync';

export interface TripPatchOperation {
  op: 'replace' | 'add' | 'remove';
  path: string;
  value?: unknown;
}

const ALLOWED_ROOT_PATHS = new Set([
  'title',
  'description',
  'destinationSummary',
  'generatedConstraints',
  'scores',
  'days',
]);

function decodePointerSegment(segment: string): string {
  return segment.replace(/~1/g, '/').replace(/~0/g, '~');
}

function parsePointer(path: string): string[] {
  if (!path.startsWith('/')) {
    throw new Error(`invalid_patch_path:${path}`);
  }

  return path.split('/').slice(1).map(decodePointerSegment);
}

function assertAllowedPath(path: string): void {
  const segments = parsePointer(path);
  if (segments.length === 0 || !ALLOWED_ROOT_PATHS.has(segments[0])) {
    throw new Error(`invalid_patch_path:${path}`);
  }
}

function getParentAndKey(root: unknown, path: string): { parent: Record<string, unknown> | unknown[]; key: string | number } {
  const segments = parsePointer(path);
  if (segments.length === 0) {
    throw new Error(`invalid_patch_path:${path}`);
  }

  let current: unknown = root;
  for (let i = 0; i < segments.length - 1; i++) {
    const segment = segments[i];
    if (Array.isArray(current)) {
      const index = Number(segment);
      if (!Number.isInteger(index) || index < 0 || index >= current.length) {
        throw new Error(`invalid_patch_path:${path}`);
      }
      current = current[index];
      continue;
    }

    if (typeof current !== 'object' || current === null || !(segment in current)) {
      throw new Error(`invalid_patch_path:${path}`);
    }

    current = (current as Record<string, unknown>)[segment];
  }

  const finalSegment = segments[segments.length - 1];
  return {
    parent: current as Record<string, unknown> | unknown[],
    key: Array.isArray(current) ? Number(finalSegment) : finalSegment,
  };
}

function applyOperation(root: Record<string, unknown>, patch: TripPatchOperation): void {
  assertAllowedPath(patch.path);
  const { parent, key } = getParentAndKey(root, patch.path);

  if (Array.isArray(parent)) {
    const index = key as number;
    if (!Number.isInteger(index) || index < 0 || index > parent.length) {
      throw new Error(`invalid_patch_path:${patch.path}`);
    }

    if (patch.op === 'remove') {
      parent.splice(index, 1);
      return;
    }

    if (patch.op === 'add') {
      parent.splice(index, 0, patch.value);
      return;
    }

    parent[index] = patch.value;
    return;
  }

  if (patch.op === 'remove') {
    delete parent[key as string];
    return;
  }

  parent[key as string] = patch.value;
}

export function applyTripPatch(base: Itinerary, patches: TripPatchOperation[]): Itinerary {
  const draft = structuredClone(base) as unknown as Record<string, unknown>;

  for (const patch of patches) {
    applyOperation(draft, patch);
  }

  return synchronizeItineraryStructures(draft as unknown as Itinerary, base);
}
