import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MofaApiSource } from './mofa-api';

// Mock fetch
const fetchMock = vi.fn();
global.fetch = fetchMock;

// Mock AI
const generateObjectMock = vi.fn();
vi.mock('ai', () => ({
  generateObject: (...args: any[]) => generateObjectMock(...args),
}));

vi.mock('@ai-sdk/google', () => ({
  createGoogleGenerativeAI: () => () => ({}),
}));

describe('MofaApiSource', () => {
  let source: MofaApiSource;

  beforeEach(() => {
    source = new MofaApiSource();
    fetchMock.mockReset();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('危険レベル抽出（外務省オープンデータ仕様）', () => {
    it('riskLevel1〜4が全て0の場合はレベル0を返す', async () => {
      // 外務省オープンデータ仕様に基づくXML（全て0=危険情報なし）
      const safeXml = `
        <opendata dataType="A" odType="04" lastModified="2025/01/16 00:00:00">
          <area>
            <cd>10</cd>
            <name>アジア</name>
          </area>
          <country areaCd="10">
            <cd>0066</cd>
            <name>タイ</name>
          </country>
          <riskLevel4>0</riskLevel4>
          <riskLevel3>0</riskLevel3>
          <riskLevel2>0</riskLevel2>
          <riskLevel1>0</riskLevel1>
          <infectionLevel4>0</infectionLevel4>
          <infectionLevel3>0</infectionLevel3>
          <infectionLevel2>0</infectionLevel2>
          <infectionLevel1>0</infectionLevel1>
        </opendata>
      `;

      fetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        text: () => Promise.resolve(safeXml),
      });

      const result = await source.fetch('タイ');

      if (!result.success) {
        throw new Error('Fetch failed');
      }

      expect(result.data.dangerLevel).toBe(0);
      expect(result.data.dangerLevelDescription).toBe('危険情報なし');
    });

    it('riskLevel1が1の場合はレベル1を返す', async () => {
      const cautionXml = `
        <opendata dataType="A" odType="04" lastModified="2025/01/16 00:00:00">
          <riskLevel4>0</riskLevel4>
          <riskLevel3>0</riskLevel3>
          <riskLevel2>0</riskLevel2>
          <riskLevel1>1</riskLevel1>
          <riskLead>一部地域で十分注意が必要です。</riskLead>
        </opendata>
      `;

      fetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        text: () => Promise.resolve(cautionXml),
      });

      const result = await source.fetch('タイ');

      if (!result.success) {
        throw new Error('Fetch failed');
      }

      expect(result.data.dangerLevel).toBe(1);
      expect(result.data.dangerLevelDescription).toBe('十分注意してください');
    });

    it('riskLevel2が1の場合はレベル2を返す', async () => {
      const avoidNonEssentialXml = `
        <opendata dataType="A" odType="04" lastModified="2025/01/16 00:00:00">
          <riskLevel4>0</riskLevel4>
          <riskLevel3>0</riskLevel3>
          <riskLevel2>1</riskLevel2>
          <riskLevel1>1</riskLevel1>
        </opendata>
      `;

      fetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        text: () => Promise.resolve(avoidNonEssentialXml),
      });

      const result = await source.fetch('タイ');

      if (!result.success) {
        throw new Error('Fetch failed');
      }

      expect(result.data.dangerLevel).toBe(2);
      expect(result.data.dangerLevelDescription).toBe('不要不急の渡航は止めてください');
    });

    it('riskLevel3が1の場合はレベル3を返す', async () => {
      const doNotTravelXml = `
        <opendata dataType="A" odType="04" lastModified="2025/01/16 00:00:00">
          <riskLevel4>0</riskLevel4>
          <riskLevel3>1</riskLevel3>
          <riskLevel2>1</riskLevel2>
          <riskLevel1>1</riskLevel1>
        </opendata>
      `;

      fetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        text: () => Promise.resolve(doNotTravelXml),
      });

      const result = await source.fetch('タイ');

      if (!result.success) {
        throw new Error('Fetch failed');
      }

      expect(result.data.dangerLevel).toBe(3);
      expect(result.data.dangerLevelDescription).toBe('渡航は止めてください（渡航中止勧告）');
    });

    it('riskLevel4が1の場合はレベル4を返す', async () => {
      const evacuateXml = `
        <opendata dataType="A" odType="04" lastModified="2025/01/16 00:00:00">
          <riskLevel4>1</riskLevel4>
          <riskLevel3>1</riskLevel3>
          <riskLevel2>1</riskLevel2>
          <riskLevel1>1</riskLevel1>
          <riskLead>退避勧告が発出されています。</riskLead>
        </opendata>
      `;

      fetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        text: () => Promise.resolve(evacuateXml),
      });

      const result = await source.fetch('タイ');

      if (!result.success) {
        throw new Error('Fetch failed');
      }

      expect(result.data.dangerLevel).toBe(4);
      expect(result.data.dangerLevelDescription).toBe('退避してください（退避勧告）');
    });

    it('最も高い危険レベルを返す（レベル4優先）', async () => {
      // 複数のレベルが1の場合、最も高いレベルを返す
      const mixedXml = `
        <opendata dataType="A" odType="04" lastModified="2025/01/16 00:00:00">
          <riskLevel4>1</riskLevel4>
          <riskLevel3>0</riskLevel3>
          <riskLevel2>1</riskLevel2>
          <riskLevel1>0</riskLevel1>
        </opendata>
      `;

      fetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        text: () => Promise.resolve(mixedXml),
      });

      const result = await source.fetch('タイ');

      if (!result.success) {
        throw new Error('Fetch failed');
      }

      expect(result.data.dangerLevel).toBe(4);
    });

    it('インドのサンプルXML形式でレベル4を返す', async () => {
      // 実際の外務省オープンデータのサンプル形式
      const indiaXml = `
        <opendata dataType="A" lastModified="2019/03/18 18:30:04" mailCount="80" odType="04">
          <area>
            <cd>10</cd>
            <name>アジア</name>
          </area>
          <country areaCd="10" countryCd="1">
            <cd>0091</cd>
            <name>インド</name>
          </country>
          <riskLevel4>1</riskLevel4>
          <riskLevel3>1</riskLevel3>
          <riskLevel2>1</riskLevel2>
          <riskLevel1>1</riskLevel1>
          <infectionLevel4>0</infectionLevel4>
          <infectionLevel3>0</infectionLevel3>
          <infectionLevel2>0</infectionLevel2>
          <infectionLevel1>0</infectionLevel1>
          <riskLeaveDate keyCd="2018T076">2018/08/01 00:00:00</riskLeaveDate>
          <riskTitle>インドの危険情報【一部地域危険レベル引き下げ】</riskTitle>
          <riskLead>インドの危険情報【一部地域危険レベル引き下げ】</riskLead>
        </opendata>
      `;

      fetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        text: () => Promise.resolve(indiaXml),
      });

      const result = await source.fetch('インド');

      if (!result.success) {
        throw new Error('Fetch failed');
      }

      expect(result.data.dangerLevel).toBe(4);
      expect(result.data.dangerLevelDescription).toBe('退避してください（退避勧告）');
    });
  });

  describe('警告情報抽出', () => {
    it('riskLeadから警告を抽出する', async () => {
      const xml = `
        <opendata dataType="A" odType="04" lastModified="2025/01/16 00:00:00">
          <riskLevel1>1</riskLevel1>
          <riskLead>首都バンコク及びその周辺地域では、一般犯罪に注意してください。</riskLead>
        </opendata>
      `;

      fetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        text: () => Promise.resolve(xml),
      });

      const result = await source.fetch('タイ');

      if (!result.success) {
        throw new Error('Fetch failed');
      }

      expect(result.data.warnings).toContain('首都バンコク及びその周辺地域では、一般犯罪に注意してください。');
    });

    it('広域・スポット情報のタイトルを抽出する', async () => {
      const xml = `
        <opendata dataType="A" odType="04" lastModified="2025/01/16 00:00:00">
          <riskLevel1>1</riskLevel1>
          <wideareaSpot>
            <title>タイ：デモ・集会に関する注意喚起</title>
            <lead>バンコク市内でデモが予定されています。</lead>
          </wideareaSpot>
        </opendata>
      `;

      fetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        text: () => Promise.resolve(xml),
      });

      const result = await source.fetch('タイ');

      if (!result.success) {
        throw new Error('Fetch failed');
      }

      expect(result.data.warnings).toContain('タイ：デモ・集会に関する注意喚起');
    });
  });

  describe('デフォルト安全情報', () => {
    it('未対応の目的地では危険レベル0のデフォルト情報を返す', async () => {
      const result = await source.fetch('未知の国');

      if (!result.success) {
        throw new Error('Fetch failed');
      }

      expect(result.data.dangerLevel).toBe(0);
      expect(result.data.dangerLevelDescription).toBe('危険情報なし');
      expect(result.source.sourceName).toContain('デフォルト');
    });

    it('404エラーの場合は失敗を返し、フォールバックを有効にする', async () => {
      fetchMock.mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      });

      const result = await source.fetch('タイ');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('国コード解決', () => {
    it('都市名から国コードを解決できる', async () => {
      const xml = `
        <opendata dataType="A" odType="04">
          <riskLevel1>1</riskLevel1>
        </opendata>
      `;

      fetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        text: () => Promise.resolve(xml),
      });

      await source.fetch('バンコク');

      // バンコク → タイ (0066) のURLでfetchが呼ばれることを確認
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('0066A.xml'),
        expect.any(Object)
      );
    });
  });

  describe('一部地域リスク判定', () => {
    it('都市名での検索かつ「全土」キーワードが含まれない場合、AIがなければレベル0が返される', async () => {
      // API Keyがない場合やAIが失敗した場合のテスト
      const originalApiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
      delete process.env.GOOGLE_GENERATIVE_AI_API_KEY;

      const xml = `
        <opendata dataType="A" odType="04" lastModified="2025/01/16 00:00:00">
          <riskLevel2>1</riskLevel2>
          <riskLead>南部国境地域に危険情報が出ています。</riskLead>
          <riskSubText>ナラティワート県などはレベル3です。</riskSubText>
        </opendata>
      `;

      fetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        text: () => Promise.resolve(xml),
      });

      // バンコク (0066) で検索
      // バンコクはテキストに含まれない -> レベル0
      const result = await source.fetch('バンコク');

      if (!result.success) throw new Error('Fetch failed');

      expect(result.data.dangerLevel).toBe(0);
      expect(result.data.maxCountryLevel).toBe(2);
      expect(result.data.isPartialCountryRisk).toBe(true);
      expect(result.data.lead).toBe('南部国境地域に危険情報が出ています。');

      process.env.GOOGLE_GENERATIVE_AI_API_KEY = originalApiKey;
    });

    it('AIが特定レベルを判定した場合、その結果が使用される', async () => {
      process.env.GOOGLE_GENERATIVE_AI_API_KEY = 'test-key';

      const xml = `
        <opendata dataType="A" odType="04" lastModified="2025/01/16 00:00:00">
          <riskLevel2>1</riskLevel2>
          <riskLead>全土で注意が必要ですが、バンコクは安全です。</riskLead>
        </opendata>
      `;

      fetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        text: () => Promise.resolve(xml),
      });

      // AIのモックレスポンス
      generateObjectMock.mockResolvedValue({
        object: {
          specificLevel: 0,
          maxCountryLevel: 2,
          highRiskRegions: [],
          reason: 'Bangkok is mentioned as safe.',
        },
      });

      const result = await source.fetch('バンコク');

      if (!result.success) throw new Error('Fetch failed');

      expect(result.data.dangerLevel).toBe(0); // AI said 0
      expect(result.data.maxCountryLevel).toBe(2);
      expect(result.data.isPartialCountryRisk).toBe(true);
      expect(generateObjectMock).toHaveBeenCalled();
    });

    it('国名での検索の場合、最大レベルが返される', async () => {
      const xml = `
        <opendata dataType="A" odType="04" lastModified="2025/01/16 00:00:00">
          <riskLevel2>1</riskLevel2>
          <riskLead>南部国境地域に危険情報が出ています。</riskLead>
        </opendata>
      `;

      fetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        text: () => Promise.resolve(xml),
      });

      // タイ (0066) で検索
      const result = await source.fetch('タイ');

      if (!result.success) throw new Error('Fetch failed');

      expect(result.data.dangerLevel).toBe(2);
      expect(result.data.maxCountryLevel).toBe(2);
      expect(result.data.isPartialCountryRisk).toBe(false);
    });

    it('「全土」キーワードが含まれる場合、都市検索でも最大レベルが返される', async () => {
      const xml = `
        <opendata dataType="A" odType="04" lastModified="2025/01/16 00:00:00">
          <riskLevel4>1</riskLevel4>
          <riskLead>ウクライナ全土に退避勧告が出ています。</riskLead>
        </opendata>
      `;

      fetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        text: () => Promise.resolve(xml),
      });

      // キーウ (0380) で検索
      const result = await source.fetch('キーウ');

      if (!result.success) throw new Error('Fetch failed');

      expect(result.data.dangerLevel).toBe(4);
      expect(result.data.maxCountryLevel).toBe(4);
      expect(result.data.isPartialCountryRisk).toBe(false);
    });

    it('都市名がテキストに含まれる場合、最大レベル（保守的評価）が返される', async () => {
       const xml = `
        <opendata dataType="A" odType="04" lastModified="2025/01/16 00:00:00">
          <riskLevel2>1</riskLevel2>
          <riskLead>プーケットで注意が必要です。</riskLead>
        </opendata>
      `;

      fetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        text: () => Promise.resolve(xml),
      });

      // プーケット (0066) で検索
      const result = await source.fetch('プーケット');

      if (!result.success) throw new Error('Fetch failed');

      expect(result.data.dangerLevel).toBe(2);
    });
  });
});
