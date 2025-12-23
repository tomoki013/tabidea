
import { PineconeStore } from "@langchain/pinecone";
import { Pinecone } from "@pinecone-database/pinecone";
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { ContentRetriever, Article } from "@/lib/ai/types";

export class PineconeRetriever implements ContentRetriever {
  private store: PineconeStore | null = null;
  private initPromise: Promise<void>;

  constructor() {
    this.initPromise = this.init();
  }

  private async init() {
    const apiKey = process.env.GOOGLE_API_KEY;
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

  async search(query: string): Promise<Article[]> {
    await this.initPromise;
    
    if (!this.store) {
        console.warn("Pinecone store not initialized, returning empty results");
        return [];
    }

    console.log(`[retriever] Searching Pinecone for: "${query}"`);
    
    try {
        const results = await this.store.similaritySearch(query, 5);
        
        console.log(`[retriever] Found ${results.length} matches`);
        
        return results.map(doc => ({
            title: (doc.metadata.title as string) || "Blog Post",
            url: (() => {
                const source = (doc.metadata.source as string) || "";
                const filename = source.split('/').pop()?.replace(/\.mdx?$/, "") || "";
                return filename ? `https://travel.tomokichidiary.com/posts/${filename}` : (doc.metadata.url as string) || "";
            })(),
            content: doc.pageContent,
            snippet: doc.pageContent.substring(0, 200) + "...",
            imageUrl: (doc.metadata.imageUrl as string) || undefined
        }));

    } catch (e) {
        console.error("[retriever] Pinecone search failed:", e);
        return [];
    }
  }
}
