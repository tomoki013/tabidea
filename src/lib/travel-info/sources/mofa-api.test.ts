import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MofaApiSource } from './mofa-api';

// Mock fetch
const fetchMock = vi.fn();
global.fetch = fetchMock;

describe('MofaApiSource', () => {
  let source: MofaApiSource;

  beforeEach(() => {
    source = new MofaApiSource();
    fetchMock.mockReset();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('危険度レベルの抽出', () => {
    it('危険情報なしの場合はレベル0を返す', async () => {
      const safeXml = `
        <country>
          <code>0001</code>
          <name>アメリカ</name>
          <info>
            Some general info but no danger level keywords.
            Have a nice trip.
          </info>
        </country>
      `;

      fetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        text: () => Promise.resolve(safeXml),
      });

      const result = await source.fetch('アメリカ');

      if (!result.success) {
        throw new Error('Fetch failed');
      }

      expect(result.data.dangerLevel).toBe(0);
      expect(result.data.dangerLevelDescription).toBe('危険情報なし');
    });

    it('ad1Bodyタグがある場合はレベル1を返す', async () => {
      const level1Xml = `
        <country>
          <code>0066</code>
          <name>タイ</name>
          <hazardInfo>
            <ad1Body>
              <area>南部国境県（ナラティワート県、ヤラー県、パッタニー県、ソンクラー県の一部）</area>
              <description>テロ等の危険があります。十分注意してください。</description>
            </ad1Body>
          </hazardInfo>
        </country>
      `;

      fetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        text: () => Promise.resolve(level1Xml),
      });

      const result = await source.fetch('タイ');

      if (!result.success) {
        throw new Error('Fetch failed');
      }

      expect(result.data.dangerLevel).toBe(1);
      expect(result.data.dangerLevelDescription).toBe('十分注意してください');
    });

    it('ad2Bodyタグがある場合はレベル2を返す', async () => {
      const level2Xml = `
        <country>
          <code>0082</code>
          <name>韓国</name>
          <hazardInfo>
            <ad2Body>
              <area>一部地域</area>
              <description>不要不急の渡航は止めてください。</description>
            </ad2Body>
            <ad1Body>
              <area>全土</area>
              <description>注意が必要です。</description>
            </ad1Body>
          </hazardInfo>
        </country>
      `;

      fetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        text: () => Promise.resolve(level2Xml),
      });

      const result = await source.fetch('韓国');

      if (!result.success) {
        throw new Error('Fetch failed');
      }

      // 最も高いレベル（ad2Body）が返される
      expect(result.data.dangerLevel).toBe(2);
      expect(result.data.dangerLevelDescription).toBe('不要不急の渡航は止めてください');
    });

    it('ad3Bodyタグがある場合はレベル3を返す', async () => {
      const level3Xml = `
        <country>
          <code>0095</code>
          <name>ミャンマー</name>
          <hazardInfo>
            <ad3Body>
              <area>全土</area>
              <description>渡航は止めてください。（渡航中止勧告）</description>
            </ad3Body>
          </hazardInfo>
        </country>
      `;

      fetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        text: () => Promise.resolve(level3Xml),
      });

      const result = await source.fetch('ミャンマー');

      if (!result.success) {
        throw new Error('Fetch failed');
      }

      expect(result.data.dangerLevel).toBe(3);
      expect(result.data.dangerLevelDescription).toBe('渡航は止めてください（渡航中止勧告）');
    });

    it('ad4Bodyタグがある場合はレベル4を返す', async () => {
      const level4Xml = `
        <country>
          <code>0095</code>
          <name>ミャンマー</name>
          <hazardInfo>
            <ad4Body>
              <area>全土</area>
              <description>退避してください。渡航は止めてください。（退避勧告）</description>
            </ad4Body>
          </hazardInfo>
        </country>
      `;

      fetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        text: () => Promise.resolve(level4Xml),
      });

      // ミャンマーを使用（国コードがマッピングに存在する）
      const result = await source.fetch('ミャンマー');

      if (!result.success) {
        throw new Error('Fetch failed');
      }

      expect(result.data.dangerLevel).toBe(4);
      expect(result.data.dangerLevelDescription).toBe('退避してください（退避勧告）');
    });

    it('「レベル1」表記からレベルを抽出する', async () => {
      const xmlWithLevelText = `
        <country>
          <code>0066</code>
          <name>タイ</name>
          <hazardAll>
            レベル1：十分注意してください。
            南部国境県においてはテロ等の危険があります。
          </hazardAll>
        </country>
      `;

      fetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        text: () => Promise.resolve(xmlWithLevelText),
      });

      const result = await source.fetch('タイ');

      if (!result.success) {
        throw new Error('Fetch failed');
      }

      expect(result.data.dangerLevel).toBe(1);
    });

    it('公式な「全土に退避」表記からレベル4を推測する', async () => {
      const xmlWithKeyword = `
        <country>
          <code>0007</code>
          <name>ロシア</name>
          <info>
            現在、全土に退避勧告が発出されています。
            直ちに退避してください。
          </info>
        </country>
      `;

      fetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        text: () => Promise.resolve(xmlWithKeyword),
      });

      // ロシアを使用（国コードがマッピングに存在する）
      const result = await source.fetch('ロシア');

      if (!result.success) {
        throw new Error('Fetch failed');
      }

      expect(result.data.dangerLevel).toBe(4);
    });

    it('一般的な「十分注意してください」はレベル0として扱う（誤検出防止）', async () => {
      // 一般的な注意喚起の文言はレベル1として誤検出しない
      const xmlWithGeneralWarning = `
        <country>
          <code>0082</code>
          <name>韓国</name>
          <info>
            一般的な犯罪に十分注意してください。
            スリや置き引きに気をつけましょう。
          </info>
        </country>
      `;

      fetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        text: () => Promise.resolve(xmlWithGeneralWarning),
      });

      const result = await source.fetch('韓国');

      if (!result.success) {
        throw new Error('Fetch failed');
      }

      // 公式な「レベル1」表記がないのでレベル0
      expect(result.data.dangerLevel).toBe(0);
    });

    it('公式な「レベル1」表記がある場合はレベル1を返す', async () => {
      const xmlWithOfficialLevel1 = `
        <country>
          <code>0066</code>
          <name>タイ</name>
          <info>
            南部一部地域にレベル1が発出されています。
            十分注意してください。
          </info>
        </country>
      `;

      fetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        text: () => Promise.resolve(xmlWithOfficialLevel1),
      });

      const result = await source.fetch('タイ');

      if (!result.success) {
        throw new Error('Fetch failed');
      }

      expect(result.data.dangerLevel).toBe(1);
    });
  });

  describe('エラーハンドリング', () => {
    it('404エラーの場合はデフォルトの安全情報を返す', async () => {
      fetchMock.mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      });

      const result = await source.fetch('未知の国');

      // フォールバックで成功として扱われる
      expect(result.success).toBe(true);
    });

    it('未知の目的地にはデフォルトの安全情報を返す', async () => {
      const result = await source.fetch('存在しない架空の国XYZ');

      expect(result.success).toBe(true);
    });
  });
});
