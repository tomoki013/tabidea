import * as cheerio from 'cheerio';
import { ContentRetriever, Article } from '@/lib/ai/types';

export class WebScraperRetriever implements ContentRetriever {
  private baseUrl = 'https://tomokichidiary.com';

  async search(query: string): Promise<Article[]> {
    console.log(`[retriever] Starting search for query: "${query}"`);
    try {
      const searchUrl = `${this.baseUrl}/?s=${encodeURIComponent(query)}`;
      console.log(`[retriever] Fetching URL: ${searchUrl}`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

      try {
          const response = await fetch(searchUrl, { signal: controller.signal });
          clearTimeout(timeoutId);

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

          // Detail fetching with timeout
          const detailedArticles = await Promise.all(articles.map(async (art) => {
            try {
                console.log(`[retriever] Fetching details for: ${art.title}`);
                const detailController = new AbortController();
                const detailTimeout = setTimeout(() => detailController.abort(), 5000); // 5s timeout per article

                const artRes = await fetch(art.url, { signal: detailController.signal });
                clearTimeout(detailTimeout);

                if(artRes.ok) {
                    const artHtml = await artRes.text();
                    const $art = cheerio.load(artHtml);
                    $art('script, style, nav, footer, header').remove();
                    const mainContent = $art('main, .entry-content, article').text().replace(/\s+/g, ' ').trim().substring(0, 2000);
                    return { ...art, content: mainContent };
                }
            } catch (e) {
                console.error(`[retriever] Failed to fetch detail for ${art.url}`, e);
            }
            return art;
          }));

          console.log(`[retriever] Completed search. Returning ${detailedArticles.length} articles.`);
          return detailedArticles;

      } catch (fetchError: unknown) {
          clearTimeout(timeoutId);
          if (fetchError instanceof Error && fetchError.name === 'AbortError') {
              console.error(`[retriever] Search request timed out after 10s`);
          } else {
              console.error(`[retriever] Fetch error:`, fetchError);
          }
          return [];
      }

    } catch (error) {
      console.error('[retriever] Unexpected error during extraction:', error);
      return [];
    }
  }
}
