/**
 * 同行者タイプ別のペルソナ定義
 * Companion type-specific persona definitions
 */

// ============================================
// 同行者タイプの定義
// ============================================

export type CompanionType =
  | 'solo'           // 一人旅
  | 'couple'         // カップル
  | 'family'         // 家族（子供あり）
  | 'family_senior'  // 家族（シニア同伴）
  | 'friends'        // 友人グループ
  | 'business';      // ビジネス

// ============================================
// ペルソナ定義
// ============================================

export interface PersonaDefinition {
  type: CompanionType;
  label: string;
  description: string;
  priorities: string[];
  avoidances: string[];
  spotPreferences: string[];
  paceGuidance: string;
  mealPreferences: string[];
  specialConsiderations: string[];
}

export const PERSONAS: Record<CompanionType, PersonaDefinition> = {
  solo: {
    type: 'solo',
    label: '一人旅',
    description: '自由気ままな一人旅。自分のペースで、自分だけの発見を。',
    priorities: [
      '柔軟性の高いスケジュール',
      '一人でも入りやすいスポット',
      '地元の人との交流機会',
      '自己成長や内省の時間',
    ],
    avoidances: [
      'グループ向けアクティビティ',
      '二人席が基本のレストラン',
      '夜遅くの危険なエリア',
    ],
    spotPreferences: [
      'カウンター席のある飲食店',
      '一人客歓迎のバー・カフェ',
      'ゲストハウスやホステル',
      '朝市や地元の市場',
      '写真映えするスポット（自撮り向き）',
    ],
    paceGuidance: '急ぎすぎず、気の向くままに。予定の30%は空白時間として残すのがおすすめ。',
    mealPreferences: [
      'カウンター席のある店',
      '食べ歩きグルメ',
      'フードコート',
      '地元の定食屋',
    ],
    specialConsiderations: [
      '安全なエリアでの宿泊を優先',
      '緊急連絡先の確認',
      '貴重品管理のアドバイス',
    ],
  },

  couple: {
    type: 'couple',
    label: 'カップル',
    description: '二人だけの特別な時間。ロマンチックな瞬間を演出。',
    priorities: [
      'ロマンチックな雰囲気',
      '二人だけの時間',
      '記念になる体験',
      '美しい景色やフォトスポット',
    ],
    avoidances: [
      '騒がしい観光地の混雑時間',
      'ファミリー向けスポット',
      '一人向けの施設',
    ],
    spotPreferences: [
      '夜景スポット',
      '雰囲気の良いレストラン',
      '隠れ家的なバー',
      'スパ・エステ',
      'サンセットポイント',
      '二人乗りのアクティビティ',
    ],
    paceGuidance: 'のんびりと二人の時間を楽しむ。詰め込みすぎず、会話を楽しむ余裕を。',
    mealPreferences: [
      '雰囲気重視のレストラン',
      '予約必須の人気店',
      'テラス席のあるカフェ',
      'コース料理',
    ],
    specialConsiderations: [
      '記念日・サプライズの演出',
      'ペアアクティビティの提案',
      'フォトスポットでの撮影時間確保',
    ],
  },

  family: {
    type: 'family',
    label: '家族（子供あり）',
    description: '子どもも大人も笑顔になれる、家族の思い出づくり。',
    priorities: [
      '子どもが楽しめるアクティビティ',
      '安全性の確保',
      '休憩時間の確保',
      '子ども向け設備の充実',
    ],
    avoidances: [
      '長時間の移動（連続2時間以上）',
      '大人向けの静かなスポット',
      '危険を伴うアクティビティ',
      '子ども入場不可の施設',
    ],
    spotPreferences: [
      'テーマパーク・遊園地',
      '動物園・水族館',
      '体験型ミュージアム',
      '公園・広場',
      'キッズスペースのあるレストラン',
    ],
    paceGuidance: 'ゆっくりペース。午前と午後に必ず休憩を入れ、夕方は早めに切り上げ。',
    mealPreferences: [
      'キッズメニューのあるレストラン',
      'ファミリーレストラン',
      'フードコート',
      '座敷席のある和食店',
    ],
    specialConsiderations: [
      'ベビーカーでの移動可否',
      'おむつ替え・授乳スポット',
      '子ども用トイレの有無',
      '熱中症・天候への配慮',
      'お昼寝時間の確保',
    ],
  },

  family_senior: {
    type: 'family_senior',
    label: '家族（シニア同伴）',
    description: '三世代で楽しむ、ゆったり安心の旅。',
    priorities: [
      'バリアフリー対応',
      '無理のないペース',
      '休憩スポットの確保',
      '移動の快適さ',
    ],
    avoidances: [
      '長時間の徒歩',
      '急な階段・坂道',
      '混雑する時間帯',
      '長時間の待ち時間',
    ],
    spotPreferences: [
      '椅子のある展望スポット',
      'バリアフリー対応の施設',
      '温泉・足湯',
      '庭園・自然',
      '歴史的建造物（エレベーターあり）',
    ],
    paceGuidance: 'ゆったりペース。1日の観光スポットは2-3箇所に抑え、休憩を多めに。',
    mealPreferences: [
      '座敷よりテーブル席',
      '和食中心',
      '消化に優しいメニュー',
      '静かな雰囲気の店',
    ],
    specialConsiderations: [
      '車椅子対応の確認',
      '段差のない経路',
      'トイレの場所を事前確認',
      '薬局・病院の場所',
      'タクシー利用の検討',
    ],
  },

  friends: {
    type: 'friends',
    label: '友人グループ',
    description: '仲間と過ごす最高の時間。アクティブに、時にはゆるく。',
    priorities: [
      'SNS映えするスポット',
      'グループで楽しめるアクティビティ',
      'コスパの良い選択肢',
      '思い出に残る体験',
    ],
    avoidances: [
      'ロマンチックすぎるスポット',
      '静かすぎる場所',
      '一人向けの体験',
    ],
    spotPreferences: [
      'フォトジェニックスポット',
      'アクティブ体験（SUP、シュノーケリング等）',
      '地元のナイトスポット',
      'グルメ巡り',
      'ショッピングエリア',
    ],
    paceGuidance: 'アクティブに動きつつ、おしゃべりタイムも確保。夜は長めに楽しめる設計で。',
    mealPreferences: [
      '大人数で入れる店',
      'シェアして楽しめる料理',
      '食べ放題・飲み放題',
      'おしゃれなカフェ',
      'ローカルフード食べ歩き',
    ],
    specialConsiderations: [
      '人数に応じた予約の重要性',
      '割り勘しやすい会計',
      'グループフォト撮影スポット',
      '各メンバーの好みへの配慮',
    ],
  },

  business: {
    type: 'business',
    label: 'ビジネス',
    description: '限られた時間で効率的に。オン・オフの切り替えを大切に。',
    priorities: [
      '効率的な移動',
      'Wi-Fi環境の確保',
      '時間の正確性',
      'ビジネスマナーへの配慮',
    ],
    avoidances: [
      '時間の読めないアクティビティ',
      'カジュアルすぎる服装が必要な場所',
      '長時間拘束されるツアー',
    ],
    spotPreferences: [
      '主要駅・空港近くのスポット',
      'ビジネスラウンジ',
      'コワーキングスペース',
      '格式ある名所',
    ],
    paceGuidance: '移動時間を最小化し、効率重視。でも食事は現地の名店で。',
    mealPreferences: [
      '駅近の名店',
      'クイックランチ可能な店',
      '接待にも使える格式ある店',
      '一人でも入りやすいカウンター店',
    ],
    specialConsiderations: [
      'モバイルバッテリー充電スポット',
      'ビジネスカジュアルで行ける場所',
      '空港アクセスの良さ',
      'ホテルのワークスペース',
    ],
  },
};

// ============================================
// ヘルパー関数
// ============================================

/**
 * 同行者タイプからペルソナを取得
 */
export function getPersona(type: CompanionType): PersonaDefinition {
  return PERSONAS[type];
}

/**
 * 同行者タイプからプロンプト用の指示を生成
 */
export function buildPersonaPrompt(type: CompanionType): string {
  const persona = PERSONAS[type];

  return `
# PERSONA CONTEXT（同行者タイプ: ${persona.label}）

## このタイプの特徴
${persona.description}

## 優先すべきこと
${persona.priorities.map(p => `- ${p}`).join('\n')}

## 避けるべきこと
${persona.avoidances.map(a => `- ${a}`).join('\n')}

## おすすめのスポットタイプ
${persona.spotPreferences.map(s => `- ${s}`).join('\n')}

## ペース配分のガイダンス
${persona.paceGuidance}

## 食事の提案
${persona.mealPreferences.map(m => `- ${m}`).join('\n')}

## 特別な配慮事項
${persona.specialConsiderations.map(c => `- ${c}`).join('\n')}
`;
}

/**
 * UserInput の companions フィールドからペルソナタイプを推定
 */
export function inferCompanionType(companions: string): CompanionType {
  const lower = companions.toLowerCase();

  if (lower.includes('一人') || lower.includes('ソロ') || lower.includes('solo')) {
    return 'solo';
  }

  if (lower.includes('カップル') || lower.includes('恋人') || lower.includes('パートナー') || lower.includes('couple')) {
    return 'couple';
  }

  if (lower.includes('家族') || lower.includes('ファミリー') || lower.includes('family')) {
    if (lower.includes('シニア') || lower.includes('親') || lower.includes('祖父') || lower.includes('祖母') || lower.includes('高齢')) {
      return 'family_senior';
    }
    if (lower.includes('子供') || lower.includes('子ども') || lower.includes('キッズ') || lower.includes('赤ちゃん')) {
      return 'family';
    }
    return 'family'; // デフォルトは子供ありファミリー
  }

  if (lower.includes('友人') || lower.includes('友達') || lower.includes('仲間') || lower.includes('グループ') || lower.includes('friends')) {
    return 'friends';
  }

  if (lower.includes('ビジネス') || lower.includes('出張') || lower.includes('仕事') || lower.includes('business')) {
    return 'business';
  }

  // デフォルトは友人グループ（最も汎用的）
  return 'friends';
}
