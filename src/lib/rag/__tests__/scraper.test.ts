import { describe, it, expect, vi } from 'vitest';
import { WebScraperRetriever } from '../scraper';

// Mock global fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('WebScraperRetriever', () => {
  it('searches and parses articles correctly', async () => {
    const mockHtml = `
      <html>
        <body>
          <article>
            <h2 class="entry-title">Test Article</h2>
            <a href="http://example.com/post1">Link</a>
            <p class="entry-summary">Snippet text</p>
            <img src="img.jpg" />
          </article>
        </body>
      </html>
    `;

    mockFetch.mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(mockHtml)
    });

    const scraper = new WebScraperRetriever();
    const results = await scraper.search('test');

    expect(results).toHaveLength(1);
    expect(results[0].title).toBe('Test Article');
    expect(results[0].url).toBe('http://example.com/post1');
  });

  it('handles fetch errors gracefully', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      statusText: 'Not Found'
    });

    const scraper = new WebScraperRetriever();
    const results = await scraper.search('test');

    expect(results).toHaveLength(0);
  });
});
