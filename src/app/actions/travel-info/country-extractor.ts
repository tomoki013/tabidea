/**
 * 目的地から国名を抽出するモジュール
 */

import { getTravelInfoGenerator } from '@/lib/ai/travel-info-generator';
import { logInfo, logWarn } from './logger';

// ============================================
// 定数
// ============================================

/**
 * 一般的な都市名と国名のマッピング
 */
const KNOWN_CITY_TO_COUNTRY: Record<string, string> = {
  // 日本
  東京: '日本',
  大阪: '日本',
  京都: '日本',
  北海道: '日本',
  沖縄: '日本',
  福岡: '日本',
  名古屋: '日本',
  札幌: '日本',
  神戸: '日本',
  横浜: '日本',
  広島: '日本',
  仙台: '日本',
  奈良: '日本',
  金沢: '日本',
  // アジア
  ソウル: '韓国',
  釜山: '韓国',
  済州島: '韓国',
  台北: '台湾',
  高雄: '台湾',
  台中: '台湾',
  香港: '香港',
  マカオ: 'マカオ',
  上海: '中国',
  北京: '中国',
  広州: '中国',
  深セン: '中国',
  バンコク: 'タイ',
  プーケット: 'タイ',
  チェンマイ: 'タイ',
  パタヤ: 'タイ',
  シンガポール: 'シンガポール',
  クアラルンプール: 'マレーシア',
  ペナン: 'マレーシア',
  ランカウイ: 'マレーシア',
  ジャカルタ: 'インドネシア',
  バリ: 'インドネシア',
  バリ島: 'インドネシア',
  マニラ: 'フィリピン',
  セブ: 'フィリピン',
  ボラカイ: 'フィリピン',
  ハノイ: 'ベトナム',
  ホーチミン: 'ベトナム',
  ダナン: 'ベトナム',
  カンボジア: 'カンボジア',
  シェムリアップ: 'カンボジア',
  プノンペン: 'カンボジア',
  デリー: 'インド',
  ムンバイ: 'インド',
  // ヨーロッパ
  パリ: 'フランス',
  ニース: 'フランス',
  リヨン: 'フランス',
  ロンドン: 'イギリス',
  エディンバラ: 'イギリス',
  マンチェスター: 'イギリス',
  ローマ: 'イタリア',
  ミラノ: 'イタリア',
  フィレンツェ: 'イタリア',
  ヴェネツィア: 'イタリア',
  ナポリ: 'イタリア',
  バルセロナ: 'スペイン',
  マドリード: 'スペイン',
  セビリア: 'スペイン',
  ベルリン: 'ドイツ',
  ミュンヘン: 'ドイツ',
  フランクフルト: 'ドイツ',
  アムステルダム: 'オランダ',
  チューリッヒ: 'スイス',
  ジュネーブ: 'スイス',
  ウィーン: 'オーストリア',
  プラハ: 'チェコ',
  ブダペスト: 'ハンガリー',
  ワルシャワ: 'ポーランド',
  アテネ: 'ギリシャ',
  サントリーニ: 'ギリシャ',
  リスボン: 'ポルトガル',
  ポルト: 'ポルトガル',
  コペンハーゲン: 'デンマーク',
  ストックホルム: 'スウェーデン',
  オスロ: 'ノルウェー',
  ヘルシンキ: 'フィンランド',
  ダブリン: 'アイルランド',
  ブリュッセル: 'ベルギー',
  // アメリカ大陸
  ニューヨーク: 'アメリカ',
  ロサンゼルス: 'アメリカ',
  ハワイ: 'アメリカ',
  ホノルル: 'アメリカ',
  サンフランシスコ: 'アメリカ',
  ラスベガス: 'アメリカ',
  シアトル: 'アメリカ',
  シカゴ: 'アメリカ',
  ボストン: 'アメリカ',
  マイアミ: 'アメリカ',
  ワシントンDC: 'アメリカ',
  サンディエゴ: 'アメリカ',
  グアム: 'アメリカ',
  サイパン: 'アメリカ',
  バンクーバー: 'カナダ',
  トロント: 'カナダ',
  モントリオール: 'カナダ',
  カンクン: 'メキシコ',
  メキシコシティ: 'メキシコ',
  // オセアニア
  シドニー: 'オーストラリア',
  メルボルン: 'オーストラリア',
  ケアンズ: 'オーストラリア',
  ゴールドコースト: 'オーストラリア',
  パース: 'オーストラリア',
  オークランド: 'ニュージーランド',
  クイーンズタウン: 'ニュージーランド',
  フィジー: 'フィジー',
  タヒチ: 'フランス領ポリネシア',
  ニューカレドニア: 'フランス',
  パラオ: 'パラオ',
  // 中東
  ドバイ: 'アラブ首長国連邦',
  アブダビ: 'アラブ首長国連邦',
  イスタンブール: 'トルコ',
  カッパドキア: 'トルコ',
  テルアビブ: 'イスラエル',
  エルサレム: 'イスラエル',
  // アフリカ
  カイロ: 'エジプト',
  ケープタウン: '南アフリカ',
  ナイロビ: 'ケニア',
  マラケシュ: 'モロッコ',
};

/**
 * 国名リスト
 */
const COMMON_COUNTRIES = [
  '日本',
  '韓国',
  '台湾',
  '中国',
  '香港',
  'マカオ',
  'タイ',
  'シンガポール',
  'マレーシア',
  'インドネシア',
  'フィリピン',
  'ベトナム',
  'カンボジア',
  'ミャンマー',
  'インド',
  'フランス',
  'イギリス',
  'イタリア',
  'スペイン',
  'ドイツ',
  'オランダ',
  'スイス',
  'オーストリア',
  'チェコ',
  'ハンガリー',
  'ポーランド',
  'ギリシャ',
  'ポルトガル',
  'デンマーク',
  'スウェーデン',
  'ノルウェー',
  'フィンランド',
  'アイルランド',
  'ベルギー',
  'アメリカ',
  'カナダ',
  'メキシコ',
  'ブラジル',
  'オーストラリア',
  'ニュージーランド',
  'フィジー',
  'パラオ',
  'アラブ首長国連邦',
  'トルコ',
  'イスラエル',
  'エジプト',
  '南アフリカ',
  'ケニア',
  'モロッコ',
];

// インフライトリクエスト用キャッシュ
const countryExtractionCache = new Map<string, Promise<string>>();

// ============================================
// 関数
// ============================================

/**
 * 目的地から国名を抽出
 *
 * 1. 既知のマッピングをチェック
 * 2. 国名リストと照合
 * 3. AIで抽出
 */
export async function extractCountryFromDestination(
  destination: string
): Promise<string> {
  const normalized = destination.trim();

  // 既知のマッピングをチェック
  if (KNOWN_CITY_TO_COUNTRY[normalized]) {
    logInfo('extractCountry', '既知のマッピングから取得', {
      destination: normalized,
      country: KNOWN_CITY_TO_COUNTRY[normalized],
    });
    return KNOWN_CITY_TO_COUNTRY[normalized];
  }

  // 国名リストと照合
  if (COMMON_COUNTRIES.includes(normalized)) {
    logInfo('extractCountry', '国名として認識', { destination: normalized });
    return normalized;
  }

  // インフライトリクエストのキャッシュをチェック
  if (countryExtractionCache.has(normalized)) {
    logInfo('extractCountry', 'キャッシュからpending Promiseを取得', {
      destination: normalized,
    });
    return countryExtractionCache.get(normalized)!;
  }

  // AIで抽出
  const extractionPromise = (async () => {
    try {
      logInfo('extractCountry', 'AIで国名を抽出開始', { destination: normalized });
      const generator = getTravelInfoGenerator();
      return await generator.extractCountry(normalized);
    } catch (error) {
      logWarn('extractCountry', 'AI抽出失敗、フォールバック', {
        destination: normalized,
        error: String(error),
      });
      return normalized; // フォールバック
    } finally {
      // 完了後はキャッシュから削除
      countryExtractionCache.delete(normalized);
    }
  })();

  // キャッシュに保存
  countryExtractionCache.set(normalized, extractionPromise);

  return extractionPromise;
}

/**
 * 既知の国名マッピングを取得（テスト用）
 */
export function getKnownMappings(): Record<string, string> {
  return { ...KNOWN_CITY_TO_COUNTRY };
}

/**
 * 既知の国名リストを取得（テスト用）
 */
export function getCommonCountries(): string[] {
  return [...COMMON_COUNTRIES];
}
