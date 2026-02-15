/**
 * AI Model Selection Service
 * サブスクリプションとリクエスト複雑度に基づいてモデルを選択
 */

import type { EntitlementStatus } from '@/types';
import type { ProviderName } from './model-provider';

// ============================================
// Types
// ============================================

export type ModelTier = 'flash' | 'pro';
export type GenerationPhase = 'outline' | 'details' | 'modify';

export interface ModelSelectionInput {
  /** ユーザーのpremium_ai権限ステータス */
  premiumAiStatus?: EntitlementStatus;
  /** ユーザーが明示的にProモデルを選択したか */
  userPrefersPro?: boolean;
  /** リクエストの複雑度（自動判定用） */
  complexity?: RequestComplexity;
  /** 生成フェーズ */
  phase?: GenerationPhase;
  /** プロバイダ（返却するモデル名を切り替える） */
  provider?: ProviderName;
}

export interface RequestComplexity {
  /** 旅行日数 */
  durationDays: number;
  /** 複数都市かどうか */
  isMultiCity: boolean;
  /** 同行者タイプ */
  companionType?: string;
  /** 特別な要件があるか（バリアフリー、子連れ等） */
  hasSpecialRequirements?: boolean;
}

export interface ModelSelection {
  /** 選択されたモデル名 */
  modelName: string;
  /** モデルティア */
  tier: ModelTier;
  /** 選択理由 */
  reason: string;
  /** 推奨温度設定 */
  temperature: number;
}

// ============================================
// Constants
// ============================================

/** Gemini Flash モデル（デフォルト） */
const MODEL_FLASH = process.env.GOOGLE_MODEL_FLASH || 'gemini-3-flash-preview';
/** Gemini Pro モデル（プレミアムユーザー向け） */
const MODEL_PRO = process.env.GOOGLE_MODEL_PRO || 'gemini-3-pro-preview';

/** OpenAI Standard モデル（Flash相当） */
const OPENAI_MODEL_STANDARD = process.env.OPENAI_MODEL_ITINERARY || process.env.OPENAI_MODEL_NAME || 'gpt-4o-mini';
/** OpenAI Pro モデル（Pro相当） */
const OPENAI_MODEL_PRO = process.env.OPENAI_MODEL_ITINERARY_PRO || 'gpt-4o';

/** フェーズ別温度設定 */
const TEMPERATURE_CONFIG: Record<GenerationPhase, number> = {
  outline: 0.3,  // 創造性と一貫性のバランス
  details: 0.1,  // 正確性重視
  modify: 0.1,   // 既存プランの修正は保守的に
};

/** 複雑度の閾値 */
const COMPLEXITY_THRESHOLDS = {
  /** 長期旅行と見なす日数 */
  longTripDays: 5,
  /** 特別な配慮が必要な同行者タイプ */
  specialCompanionTypes: ['family', 'family_senior'],
};

// ============================================
// Model Selection Logic
// ============================================

/**
 * リクエストの複雑度を評価
 */
export function evaluateComplexity(complexity?: RequestComplexity): 'low' | 'medium' | 'high' {
  if (!complexity) return 'low';

  let score = 0;

  // 日数による評価
  if (complexity.durationDays >= COMPLEXITY_THRESHOLDS.longTripDays) {
    score += 2;
  } else if (complexity.durationDays >= 3) {
    score += 1;
  }

  // 複数都市
  if (complexity.isMultiCity) {
    score += 2;
  }

  // 特別な同行者タイプ
  if (complexity.companionType &&
      COMPLEXITY_THRESHOLDS.specialCompanionTypes.includes(complexity.companionType)) {
    score += 1;
  }

  // 特別な要件
  if (complexity.hasSpecialRequirements) {
    score += 1;
  }

  if (score >= 4) return 'high';
  if (score >= 2) return 'medium';
  return 'low';
}

/**
 * Proモデルを使用すべきかを判定
 */
export function shouldUsePro(input: ModelSelectionInput): boolean {
  // 1. premium_ai 権限がない場合は Flash
  if (!input.premiumAiStatus?.hasAccess) {
    return false;
  }

  // 2. ユーザーが明示的に Pro を選択した場合
  if (input.userPrefersPro === true) {
    return true;
  }

  // 3. 複雑度が高い場合（サブスク加入者のみ）
  if (input.complexity) {
    const complexityLevel = evaluateComplexity(input.complexity);
    if (complexityLevel === 'high') {
      return true;
    }
  }

  // 4. デフォルトは Flash
  return false;
}

/**
 * モデル選択のメインエントリーポイント
 */
export function selectModel(input: ModelSelectionInput): ModelSelection {
  const phase = input.phase || 'details';
  const usePro = shouldUsePro(input);
  const provider = input.provider || (process.env.AI_PROVIDER_ITINERARY as ProviderName) || 'gemini';

  if (provider === 'openai') {
    const modelName = usePro ? OPENAI_MODEL_PRO : OPENAI_MODEL_STANDARD;
    const reason = usePro ? 'Premium OpenAI model' : 'Standard OpenAI model';
    console.log(`[model-selector] Selected OpenAI model: ${modelName} (${reason})`);
    return {
      modelName,
      tier: usePro ? 'pro' : 'flash',
      reason,
      temperature: TEMPERATURE_CONFIG[phase],
    };
  }

  if (usePro) {
    const reason = input.userPrefersPro
      ? 'ユーザーがProモデルを選択'
      : '複雑なリクエストのため自動選択';

    console.log(`[model-selector] Selected PRO model: ${MODEL_PRO} (${reason})`);

    return {
      modelName: MODEL_PRO,
      tier: 'pro',
      reason,
      temperature: TEMPERATURE_CONFIG[phase],
    };
  }

  const reason = input.premiumAiStatus?.hasAccess
    ? 'シンプルなリクエストのためFlashを使用'
    : '無料プランのためFlashを使用';

  console.log(`[model-selector] Selected FLASH model: ${MODEL_FLASH} (${reason})`);

  return {
    modelName: MODEL_FLASH,
    tier: 'flash',
    reason,
    temperature: TEMPERATURE_CONFIG[phase],
  };
}

// ============================================
// Helper Functions
// ============================================

/**
 * UserInput から RequestComplexity を抽出
 */
export function extractComplexity(userInput: {
  destinations?: string;
  duration?: number;
  companions?: string;
  specialRequirements?: string;
}): RequestComplexity {
  const destinations = userInput.destinations || '';
  const isMultiCity = destinations.includes('、') ||
                      destinations.includes(',') ||
                      destinations.includes('→') ||
                      destinations.includes('周遊');

  const companionType = inferCompanionTypeFromInput(userInput.companions || '');
  const hasSpecialRequirements = !!(
    userInput.specialRequirements ||
    (userInput.companions && (
      userInput.companions.includes('バリアフリー') ||
      userInput.companions.includes('車椅子') ||
      userInput.companions.includes('ベビーカー') ||
      userInput.companions.includes('アレルギー')
    ))
  );

  return {
    durationDays: userInput.duration || 1,
    isMultiCity,
    companionType,
    hasSpecialRequirements,
  };
}

/**
 * 同行者の説明文からタイプを推定（簡易版）
 */
function inferCompanionTypeFromInput(companions: string): string | undefined {
  const lower = companions.toLowerCase();

  if (lower.includes('一人') || lower.includes('ソロ')) return 'solo';
  if (lower.includes('カップル') || lower.includes('恋人')) return 'couple';
  if (lower.includes('シニア') || lower.includes('親') || lower.includes('祖父') || lower.includes('祖母')) return 'family_senior';
  if (lower.includes('家族') || lower.includes('子供') || lower.includes('子ども')) return 'family';
  if (lower.includes('友人') || lower.includes('友達') || lower.includes('グループ')) return 'friends';
  if (lower.includes('ビジネス') || lower.includes('出張')) return 'business';

  return undefined;
}

/**
 * 環境変数からモデル名を取得（ユーティリティ）
 */
export function getModelNames(): { flash: string; pro: string } {
  return {
    flash: MODEL_FLASH,
    pro: MODEL_PRO,
  };
}

/**
 * フェーズに対応する温度設定を取得
 */
export function getTemperature(phase: GenerationPhase): number {
  return TEMPERATURE_CONFIG[phase];
}
