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

  it('should return dangerLevel 0 when no danger level is found in XML', async () => {
    // Mock successful XML response with no danger level info
    // This represents a safe country where MOFA returns data but no specific danger warning
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

    // Expect Level 0 (Safe)
    // Currently, this test is expected to FAIL because the code defaults to 1
    expect(result.data.dangerLevel).toBe(0);
  });
});
