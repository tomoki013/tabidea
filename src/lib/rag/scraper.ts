import * as cheerio from 'cheerio';
import { ContentRetriever, Article } from '@/lib/ai/types';
import {
  ethicalFetchSafe,
  RobotsTxtDeniedError,
  DomainNotAllowedError
} from '@/lib/utils/http-client';

export class WebScraperRetriever implements ContentRetriever {
  private baseUrl = 'https://tomokichidiary.com';

  async search(query: string): Promise<Article[]> {
    console.log(`[retriever] Starting search for query: "${query}"`);
    try {
      const searchUrl = `${this.baseUrl}/?s=${encodeURIComponent(query)}`;
      console.log(`[retriever] Fetching URL: ${searchUrl}`);

      // Use ethical fetch wrapper with proper rate limiting and robots.txt respect
      const response = await ethicalFetchSafe(searchUrl, {
        timeoutMs: 10000,
        maxRetries: 2
      });

      if (!response) {
        console.error(`[retriever] Failed to fetch ${searchUrl}: ethical fetch returned null`);
        return [];
      }

      if (!response.ok) {
        console.error(`[retriever] Failed to fetch ${searchUrl}: ${response.status} ${response.statusText}`);
        return [];
      }

      const html = await response.text();
      const $ = cheerio.load(html);
      const articles: Article[] = [];

      $('article, .post, .entry').each((_, element) => {
        if (articles.length >= 3) return;

        const title = $(element).find('h2, h3, .entry-title').first().text().trim();
        const link = $(element).find('a').first().attr('href');
        const snippet = $(element).find('p, .entry-summary, .post-excerpt').first().text().trim().substring(0, 200);
        const img = $(element).find('img').first().attr('src');

        if (title && link) {
          articles.push({
            title,
            url: link,
            content: snippet,
            snippet: snippet + '...',
            imageUrl: img
          });
        }
      });

      console.log(`[retriever] Found ${articles.length} initial articles.`);

      // Detail fetching with ethical fetch wrapper (sequential to respect rate limits)
      const detailedArticles: Article[] = [];
      for (const art of articles) {
        try {
          console.log(`[retriever] Fetching details for: ${art.title}`);

          const artRes = await ethicalFetchSafe(art.url, {
            timeoutMs: 5000,
            maxRetries: 1
          });

          if (artRes?.ok) {
            const artHtml = await artRes.text();
            const $art = cheerio.load(artHtml);
            $art('script, style, nav, footer, header').remove();
            const mainContent = $art('main, .entry-content, article').text().replace(/\s+/g, ' ').trim().substring(0, 2000);
            detailedArticles.push({ ...art, content: mainContent });
          } else {
            detailedArticles.push(art);
          }
        } catch (e) {
          if (e instanceof RobotsTxtDeniedError) {
            console.log(`[retriever] Skipping ${art.url}: blocked by robots.txt`);
          } else if (e instanceof DomainNotAllowedError) {
            console.log(`[retriever] Skipping ${art.url}: domain not allowed`);
          } else {
            console.error(`[retriever] Failed to fetch detail for ${art.url}`, e);
          }
          detailedArticles.push(art);
        }
      }

      console.log(`[retriever] Completed search. Returning ${detailedArticles.length} articles.`);
      return detailedArticles;

    } catch (error) {
      console.error('[retriever] Unexpected error during extraction:', error);
      return [];
    }
  }
}
