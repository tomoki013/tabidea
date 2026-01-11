
import { PineconeStore } from "@langchain/pinecone";
import { Pinecone } from "@pinecone-database/pinecone";
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { ContentRetriever, Article, SearchOptions } from "@/lib/ai/types";

export class PineconeRetriever implements ContentRetriever {
  private store: PineconeStore | null = null;
  private initPromise: Promise<void>;

  constructor() {
    this.initPromise = this.init();
  }

  private async init() {
    const apiKey = process.env.GOOGLE_GENERATIVE_API_KEY;
    const pineconeApiKey = process.env.PINECONE_API_KEY;
    const pineconeIndex = process.env.PINECONE_INDEX;

    if (!apiKey || !pineconeApiKey || !pineconeIndex) {
        console.error("Missing RAG environment variables");
        return;
    }

    const embeddings = new GoogleGenerativeAIEmbeddings({
        model: "models/text-embedding-004",
        apiKey: apiKey
    });

    const pinecone = new Pinecone({ apiKey: pineconeApiKey });
    const index = pinecone.Index(pineconeIndex);

    this.store = await PineconeStore.fromExistingIndex(
        embeddings,
        { pineconeIndex: index }
    );
  }

  async search(query: string, options?: SearchOptions): Promise<Article[]> {
    await this.initPromise;

    if (!this.store) {
        console.warn("Pinecone store not initialized, returning empty results");
        return [];
    }

    const topK = options?.topK ?? 5;
    const minScore = options?.minScore ?? 0.7;

    console.log(`[retriever] Searching Pinecone for: "${query}" (topK: ${topK}, minScore: ${minScore})`);

    try {
        const resultsWithScore = await this.store.similaritySearchWithScore(query, topK);

        console.log(`[retriever] Found ${resultsWithScore.length} matches before filtering`);

        // Filter by minimum score
        const filteredResults = resultsWithScore.filter(([, score]) => score >= minScore);

        console.log(`[retriever] After filtering (score >= ${minScore}): ${filteredResults.length} matches`);

        return filteredResults.map(([doc, score]) => ({
            title: (doc.metadata.title as string) || "Blog Post",
            url: (() => {
                const source = (doc.metadata.source as string) || "";
                const filename = source.split('/').pop()?.replace(/\.mdx?$/, "") || "";
                return filename ? `https://travel.tomokichidiary.com/posts/${filename}` : (doc.metadata.url as string) || "";
            })(),
            content: doc.pageContent,
            snippet: doc.pageContent.substring(0, 200) + "...",
            imageUrl: (doc.metadata.imageUrl as string) || undefined,
            relevanceScore: score
        }));

    } catch (e) {
        console.error("[retriever] Pinecone search failed:", e);
        return [];
    }
  }
}
