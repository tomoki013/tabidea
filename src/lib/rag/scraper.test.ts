import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { WebScraperRetriever } from './scraper';

// Mock the ethical fetch module
vi.mock('@/lib/utils/http-client', () => ({
  ethicalFetchSafe: vi.fn(),
  RobotsTxtDeniedError: class RobotsTxtDeniedError extends Error {
    constructor(url: string) {
      super(`Access denied by robots.txt: ${url}`);
      this.name = 'RobotsTxtDeniedError';
    }
  },
  DomainNotAllowedError: class DomainNotAllowedError extends Error {
    constructor(url: string) {
      super(`Domain not in allowed list: ${url}`);
      this.name = 'DomainNotAllowedError';
    }
  }
}));

import { ethicalFetchSafe } from '@/lib/utils/http-client';
const mockEthicalFetchSafe = vi.mocked(ethicalFetchSafe);

describe('WebScraperRetriever', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('searches and parses articles correctly', async () => {
    const mockHtml = `
      <html>
        <body>
          <article>
            <h2 class="entry-title">Test Article</h2>
            <a href="https://tomokichidiary.com/post1">Link</a>
            <p class="entry-summary">Snippet text</p>
            <img src="img.jpg" />
          </article>
        </body>
      </html>
    `;

    const mockDetailHtml = `
      <html>
        <body>
          <main>Detailed content here</main>
        </body>
      </html>
    `;

    // Mock search page response
    mockEthicalFetchSafe.mockResolvedValueOnce({
      ok: true,
      text: () => Promise.resolve(mockHtml)
    } as Response);

    // Mock detail page response
    mockEthicalFetchSafe.mockResolvedValueOnce({
      ok: true,
      text: () => Promise.resolve(mockDetailHtml)
    } as Response);

    const scraper = new WebScraperRetriever();
    const results = await scraper.search('test');

    expect(results).toHaveLength(1);
    expect(results[0].title).toBe('Test Article');
    expect(results[0].url).toBe('https://tomokichidiary.com/post1');
    expect(results[0].content).toBe('Detailed content here');
  });

  it('handles fetch errors gracefully', async () => {
    mockEthicalFetchSafe.mockResolvedValue({
      ok: false,
      status: 404,
      statusText: 'Not Found'
    } as Response);

    const scraper = new WebScraperRetriever();
    const results = await scraper.search('test');

    expect(results).toHaveLength(0);
  });

  it('handles null response from ethical fetch', async () => {
    mockEthicalFetchSafe.mockResolvedValue(null);

    const scraper = new WebScraperRetriever();
    const results = await scraper.search('test');

    expect(results).toHaveLength(0);
  });

  it('falls back to snippet when detail fetch fails', async () => {
    const mockHtml = `
      <html>
        <body>
          <article>
            <h2 class="entry-title">Test Article</h2>
            <a href="https://tomokichidiary.com/post1">Link</a>
            <p class="entry-summary">Snippet text for fallback</p>
          </article>
        </body>
      </html>
    `;

    // Mock search page response
    mockEthicalFetchSafe.mockResolvedValueOnce({
      ok: true,
      text: () => Promise.resolve(mockHtml)
    } as Response);

    // Mock detail page response failure
    mockEthicalFetchSafe.mockResolvedValueOnce(null);

    const scraper = new WebScraperRetriever();
    const results = await scraper.search('test');

    expect(results).toHaveLength(1);
    expect(results[0].title).toBe('Test Article');
    expect(results[0].content).toBe('Snippet text for fallback');
  });
});
