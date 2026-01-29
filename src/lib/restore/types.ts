import type { UserInput, Itinerary } from '@/types';

export type RestoreType = 'wizard' | 'modal' | 'plan';

export interface PendingState {
  /** 入力データ */
  userInput: UserInput;
  /** 生成済みプラン（ある場合） */
  itinerary?: Itinerary;
  /** ローカルプランID（/plan/local/[id] から来た場合） */
  localPlanId?: string;
  /** ウィザードのステップ */
  currentStep: number;
  /** 復元タイプ */
  restoreType: RestoreType;
  /** 保存日時（ISO string） */
  savedAt: string;
  /** 戻り先パス（モーダルの場合） */
  returnPath?: string;
}

export interface RestoreResult {
  success: boolean;
  data?: PendingState;
  expired?: boolean;
  error?: string;
}
