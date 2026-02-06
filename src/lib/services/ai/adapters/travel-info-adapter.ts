/**
 * Travel Info Adapter
 * 渡航情報サービスのデータをプロンプト注入用のスナップショットに変換
 */

import type { TravelInfoCategory, CategoryDataMap } from '@/types';

export interface TravelInfoSnapshot {
  /** 治安サマリー（1-2文） */
  safety?: string;
  /** 気候情報サマリー */
  weather?: string;
  /** 通貨・物価情報 */
  currency?: string;
  /** ビザ情報サマリー */
  visa?: string;
}

interface CategoryState {
  data: CategoryDataMap[TravelInfoCategory];
  loading?: boolean;
  error?: string;
}

/**
 * 渡航情報データをプロンプト注入用のスナップショットに変換
 */
export function buildTravelInfoSnapshot(
  _destination: string,
  travelInfoData?: Map<TravelInfoCategory, CategoryState>
): TravelInfoSnapshot {
  const snapshot: TravelInfoSnapshot = {};

  if (!travelInfoData) return snapshot;

  // Safety info
  const safetyData = travelInfoData.get('safety');
  if (safetyData?.data && !safetyData.loading) {
    const safety = safetyData.data as CategoryDataMap['safety'];
    const parts: string[] = [];
    if (safety.dangerLevel !== undefined) {
      parts.push(`危険度レベル: ${safety.dangerLevel}`);
    }
    if (safety.dangerLevelDescription) {
      parts.push(safety.dangerLevelDescription);
    }
    if (safety.lead) {
      parts.push(safety.lead);
    }
    if (parts.length > 0) {
      snapshot.safety = parts.join('。');
    }
  }

  // Climate info
  const climateData = travelInfoData.get('climate');
  if (climateData?.data && !climateData.loading) {
    const climate = climateData.data as CategoryDataMap['climate'];
    const parts: string[] = [];
    if (climate.currentWeather) {
      const w = climate.currentWeather;
      if (w.temp !== undefined) parts.push(`現在の気温: ${w.temp}°C`);
      if (w.condition) parts.push(w.condition);
    }
    if (climate.seasonDescription) {
      parts.push(climate.seasonDescription);
    }
    if (climate.recommendedClothing && climate.recommendedClothing.length > 0) {
      parts.push(`服装: ${climate.recommendedClothing.join('、')}`);
    }
    if (parts.length > 0) {
      snapshot.weather = parts.join('。');
    }
  }

  // Currency info
  const basicData = travelInfoData.get('basic');
  if (basicData?.data && !basicData.loading) {
    const basic = basicData.data as CategoryDataMap['basic'];
    const parts: string[] = [];
    if (basic.currency) {
      const c = basic.currency;
      if (c.name) parts.push(`通貨: ${c.name}${c.code ? ` (${c.code})` : ''}`);
      if (c.symbol) parts.push(`記号: ${c.symbol}`);
    }
    if (basic.exchangeRate) {
      const rate = basic.exchangeRate;
      if (rate.rate) parts.push(`為替: 1単位 = 約${rate.rate}${rate.baseCurrency || '円'}`);
    }
    if (parts.length > 0) {
      snapshot.currency = parts.join('、');
    }
  }

  // Visa info
  const visaData = travelInfoData.get('visa');
  if (visaData?.data && !visaData.loading) {
    const visa = visaData.data as CategoryDataMap['visa'];
    const parts: string[] = [];
    if (visa.required !== undefined) {
      parts.push(visa.required ? 'ビザ必要' : 'ビザ不要（短期滞在）');
    }
    if (visa.visaFreeStayDays) {
      parts.push(`ビザなし滞在: ${visa.visaFreeStayDays}日間`);
    }
    if (visa.notes && visa.notes.length > 0) {
      parts.push(visa.notes[0]);
    }
    if (parts.length > 0) {
      snapshot.visa = parts.join('。');
    }
  }

  return snapshot;
}

/**
 * TravelInfoSnapshot をプロンプト用テキストに変換
 */
export function formatTravelInfoForPrompt(snapshot: TravelInfoSnapshot): string {
  const lines: string[] = [];

  if (snapshot.safety) {
    lines.push(`- 安全情報: ${snapshot.safety}`);
  }
  if (snapshot.weather) {
    lines.push(`- 気候・天気: ${snapshot.weather}`);
  }
  if (snapshot.currency) {
    lines.push(`- 通貨・為替: ${snapshot.currency}`);
  }
  if (snapshot.visa) {
    lines.push(`- ビザ・入国: ${snapshot.visa}`);
  }

  if (lines.length === 0) return '';

  return lines.join('\n');
}
