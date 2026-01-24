/**
 * Server-side encryption utilities
 * Uses AES-256-GCM for encrypting user plans
 * Supports key versioning for future key rotation
 */

import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  createHash,
  pbkdf2Sync,
} from 'crypto';

import type { UserInput, Itinerary } from '@/types';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;
const KEY_LENGTH = 32;

// Current active key version
const CURRENT_KEY_VERSION = 1;

interface KeyDerivationConfig {
  version: number;
  algorithm: 'sha256' | 'pbkdf2' | 'argon2';
  iterations: number;
}

// Key version configurations
const KEY_CONFIGS: Record<number, KeyDerivationConfig> = {
  1: {
    version: 1,
    algorithm: 'sha256',
    iterations: 1,
  },
  // Future version example:
  // 2: {
  //   version: 2,
  //   algorithm: 'pbkdf2',
  //   iterations: 100000,
  // },
};

/**
 * Get master secret from environment variable
 */
function getMasterSecret(version: number = CURRENT_KEY_VERSION): Buffer {
  const secretKey =
    version === 1
      ? 'ENCRYPTION_MASTER_SECRET'
      : `ENCRYPTION_MASTER_SECRET_V${version}`;

  const secret = process.env[secretKey] || process.env.ENCRYPTION_MASTER_SECRET;

  if (!secret) {
    throw new Error(`${secretKey} is not set`);
  }

  return Buffer.from(secret, 'utf-8');
}

/**
 * Derive user-specific encryption key
 */
export function deriveUserKey(
  userId: string,
  userSalt: string,
  version: number = CURRENT_KEY_VERSION
): Buffer {
  const config = KEY_CONFIGS[version];
  if (!config) {
    throw new Error(`Unknown key version: ${version}`);
  }

  const masterSecret = getMasterSecret(version);
  const combined = `${userId}:${userSalt}`;

  switch (config.algorithm) {
    case 'sha256':
      return createHash('sha256')
        .update(masterSecret)
        .update(combined)
        .digest()
        .subarray(0, KEY_LENGTH);

    case 'pbkdf2':
      return pbkdf2Sync(
        masterSecret,
        combined,
        config.iterations,
        KEY_LENGTH,
        'sha256'
      );

    case 'argon2':
      throw new Error('Argon2 not yet implemented');

    default:
      throw new Error(`Unknown algorithm: ${config.algorithm}`);
  }
}

/**
 * Get current key version
 */
export function getCurrentKeyVersion(): number {
  return CURRENT_KEY_VERSION;
}

/**
 * Encrypt data
 */
export function encryptData(
  data: object,
  userId: string,
  userSalt: string,
  version: number = CURRENT_KEY_VERSION
): { encrypted: string; iv: string; keyVersion: number } {
  const key = deriveUserKey(userId, userSalt, version);
  const iv = randomBytes(IV_LENGTH);
  const plaintext = JSON.stringify(data);

  const cipher = createCipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });

  let encrypted = cipher.update(plaintext, 'utf8', 'base64');
  encrypted += cipher.final('base64');

  const authTag = cipher.getAuthTag();
  const encryptedWithTag = Buffer.concat([
    Buffer.from(encrypted, 'base64'),
    authTag,
  ]).toString('base64');

  return {
    encrypted: encryptedWithTag,
    iv: iv.toString('base64'),
    keyVersion: version,
  };
}

/**
 * Decrypt data
 */
export function decryptData<T = unknown>(
  encrypted: string,
  iv: string,
  userId: string,
  userSalt: string,
  version: number = CURRENT_KEY_VERSION
): T {
  const key = deriveUserKey(userId, userSalt, version);
  const ivBuffer = Buffer.from(iv, 'base64');
  const encryptedBuffer = Buffer.from(encrypted, 'base64');

  const authTag = encryptedBuffer.subarray(-AUTH_TAG_LENGTH);
  const ciphertext = encryptedBuffer.subarray(0, -AUTH_TAG_LENGTH);

  const decipher = createDecipheriv(ALGORITHM, key, ivBuffer, {
    authTagLength: AUTH_TAG_LENGTH,
  });
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(ciphertext, undefined, 'utf8');
  decrypted += decipher.final('utf8');

  return JSON.parse(decrypted) as T;
}

/**
 * Generate encryption salt
 */
export function generateSalt(): string {
  return randomBytes(32).toString('base64');
}

// ============================================
// Key Rotation (Re-wrapping)
// ============================================

export interface ReWrapResult {
  encrypted: string;
  iv: string;
  keyVersion: number;
  wasReWrapped: boolean;
}

/**
 * Re-wrap data with new key version
 */
export function reWrapData(
  encrypted: string,
  iv: string,
  oldVersion: number,
  userId: string,
  userSalt: string,
  newVersion: number = CURRENT_KEY_VERSION
): ReWrapResult {
  if (oldVersion >= newVersion) {
    return {
      encrypted,
      iv,
      keyVersion: oldVersion,
      wasReWrapped: false,
    };
  }

  const decrypted = decryptData(encrypted, iv, userId, userSalt, oldVersion);
  const reEncrypted = encryptData(
    decrypted as object,
    userId,
    userSalt,
    newVersion
  );

  return {
    encrypted: reEncrypted.encrypted,
    iv: reEncrypted.iv,
    keyVersion: reEncrypted.keyVersion,
    wasReWrapped: true,
  };
}

/**
 * Check if key version is outdated
 */
export function isKeyVersionOutdated(version: number): boolean {
  return version < CURRENT_KEY_VERSION;
}

// ============================================
// Plan-specific encryption helpers
// ============================================

export interface EncryptedPlanData {
  input: UserInput;
  itinerary: Itinerary;
  metadata?: {
    destination: string;
    durationDays: number;
    thumbnailUrl?: string;
  };
}

export interface PlanEncryptionResult {
  encryptedData: string;
  encryptionIv: string;
  keyVersion: number;
  destination?: string;
  durationDays?: number;
  thumbnailUrl?: string;
}

/**
 * Encrypt plan data
 * Extracts metadata from payload before encryption for consistency
 */
export function encryptPlan(
  data: EncryptedPlanData,
  userId: string,
  userSalt: string,
  isPublic: boolean
): PlanEncryptionResult {
  // Extract metadata from encrypted data (prevents inconsistency)
  const extractedMetadata = {
    destination: data.itinerary?.destination || data.metadata?.destination || '',
    durationDays:
      data.itinerary?.days?.length || data.metadata?.durationDays || 1,
    thumbnailUrl: data.itinerary?.heroImage || data.metadata?.thumbnailUrl,
  };

  // Prepare data to encrypt
  const dataToEncrypt: EncryptedPlanData = {
    input: data.input,
    itinerary: data.itinerary,
    metadata: isPublic ? undefined : extractedMetadata,
  };

  const { encrypted, iv, keyVersion } = encryptData(
    dataToEncrypt,
    userId,
    userSalt
  );

  const result: PlanEncryptionResult = {
    encryptedData: encrypted,
    encryptionIv: iv,
    keyVersion,
  };

  // For public plans, return plaintext metadata for search/listing
  if (isPublic) {
    result.destination = extractedMetadata.destination;
    result.durationDays = extractedMetadata.durationDays;
    result.thumbnailUrl = extractedMetadata.thumbnailUrl;
  }

  return result;
}

/**
 * Decrypt plan data
 */
export function decryptPlan(
  encryptedData: string,
  encryptionIv: string,
  userId: string,
  userSalt: string,
  keyVersion: number = CURRENT_KEY_VERSION
): EncryptedPlanData {
  return decryptData<EncryptedPlanData>(
    encryptedData,
    encryptionIv,
    userId,
    userSalt,
    keyVersion
  );
}

/**
 * Re-wrap plan with new key version
 */
export function reWrapPlan(
  encryptedData: string,
  encryptionIv: string,
  oldKeyVersion: number,
  userId: string,
  userSalt: string
): ReWrapResult {
  return reWrapData(
    encryptedData,
    encryptionIv,
    oldKeyVersion,
    userId,
    userSalt
  );
}
