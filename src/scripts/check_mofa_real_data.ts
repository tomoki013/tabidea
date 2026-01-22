import { createMofaApiSource } from '../lib/services/travel-info/sources/mofa-api';

async function main() {
  const source = createMofaApiSource();
  // テスト対象の目的地
  // アメリカ: 通常は危険情報なし（レベル0）の期待
  // タイ: 一部地域でレベル1-3の可能性がある
  // ロシア: 全土でレベル3-4の可能性がある
  // イスラエル: レベル3-4の可能性がある
  // ウクライナ: レベル4の可能性がある
  // パリ: ユーザー検証用（国コード0033）
  const destinations = ['アメリカ', 'タイ', 'ロシア', 'イスラエル', 'ウクライナ', 'パリ'];

  console.log('=== Starting MOFA API Verification ===');

  for (const destination of destinations) {
    console.log(`\n--------------------------------------------------`);
    console.log(`Checking safety info for: ${destination}`);
    console.log(`--------------------------------------------------`);

    try {
      const result = await source.fetch(destination);

      console.log(`\nResult for ${destination}:`);
      console.log(`Success: ${result.success}`);
      if (result.success) {
        console.log(`Danger Level: ${result.data.dangerLevel}`);
        console.log(`Description: ${result.data.dangerLevelDescription}`);
        console.log(`Warnings (first 2):`, result.data.warnings.slice(0, 2));
      }
    } catch (error) {
      console.error(`Error fetching for ${destination}:`, error);
    }

    // APIへの負荷軽減のため少し待機
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log('\n=== Verification Complete ===');
}

main().catch(console.error);
