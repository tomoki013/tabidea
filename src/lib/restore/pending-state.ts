import type { PendingState, RestoreResult, RestoreType } from './types';
import type { UserInput, Itinerary } from '@/types';

const STORAGE_KEY = 'tabidea_pending_state';
const EXPIRY_HOURS = 24;

/**
 * 状態を保存
 */
export function savePendingState(params: {
  userInput: UserInput;
  itinerary?: Itinerary;
  localPlanId?: string;
  currentStep: number;
  restoreType: RestoreType;
  returnPath?: string;
}): void {
  const state: PendingState = {
    userInput: params.userInput,
    itinerary: params.itinerary,
    localPlanId: params.localPlanId,
    currentStep: params.currentStep,
    restoreType: params.restoreType,
    savedAt: new Date().toISOString(),
    returnPath: params.returnPath,
  };

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.error('Failed to save pending state:', error);
    // ストレージがいっぱいの場合は古いデータを削除して再試行
    clearExpiredData();
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (retryError) {
      console.error('Failed to save pending state after cleanup:', retryError);
    }
  }
}

/**
 * 状態を復元
 */
export function restorePendingState(): RestoreResult {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);

    if (!stored) {
      return { success: false, error: 'No pending state found' };
    }

    const state: PendingState = JSON.parse(stored);

    // 有効期限チェック
    const savedAt = new Date(state.savedAt);
    const now = new Date();
    const hoursDiff = (now.getTime() - savedAt.getTime()) / (1000 * 60 * 60);

    if (hoursDiff > EXPIRY_HOURS) {
      clearPendingState();
      return {
        success: false,
        expired: true,
        error: `保存から${EXPIRY_HOURS}時間以上経過したため、入力内容は削除されました。`,
      };
    }

    return { success: true, data: state };
  } catch (error) {
    console.error('Failed to restore pending state:', error);
    return { success: false, error: 'Failed to parse pending state' };
  }
}

/**
 * 状態をクリア
 */
export function clearPendingState(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY);
}

/**
 * 保存状態があるかチェック
 */
export function hasPendingState(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(STORAGE_KEY) !== null;
}

/**
 * 残り有効時間を取得（分）
 */
export function getPendingStateRemainingMinutes(): number | null {
  if (typeof window === 'undefined') return null;

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;

    const state: PendingState = JSON.parse(stored);
    const savedAt = new Date(state.savedAt);
    const expiresAt = new Date(
      savedAt.getTime() + EXPIRY_HOURS * 60 * 60 * 1000
    );
    const now = new Date();

    const remainingMs = expiresAt.getTime() - now.getTime();
    if (remainingMs <= 0) return 0;

    return Math.floor(remainingMs / (1000 * 60));
  } catch {
    return null;
  }
}

/**
 * 期限切れデータをクリア
 */
function clearExpiredData(): void {
  if (typeof window === 'undefined') return;

  // 他の期限切れローカルストレージもクリア
  const keysToCheck = ['tabidea_pending_state', 'tabidea_local_plans'];

  keysToCheck.forEach((key) => {
    try {
      const data = localStorage.getItem(key);
      if (data) {
        const parsed = JSON.parse(data);
        if (parsed.savedAt || parsed.createdAt) {
          const savedAt = new Date(parsed.savedAt || parsed.createdAt);
          const hoursDiff =
            (Date.now() - savedAt.getTime()) / (1000 * 60 * 60);
          if (hoursDiff > EXPIRY_HOURS) {
            localStorage.removeItem(key);
          }
        }
      }
    } catch {
      // パースエラーは無視
    }
  });
}
