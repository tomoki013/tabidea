import { Itinerary } from "@/lib/types";

export interface Article {
  title: string;
  url: string;
  content: string;
  snippet: string;
  imageUrl?: string;
  relevanceScore?: number;
}

export interface SearchOptions {
  topK?: number;      // デフォルト: 5
  minScore?: number;  // デフォルト: 0.7
}

export interface AIService {
  generateItinerary(
    prompt: string,
    context: Article[],
    startDay?: number,
    endDay?: number
  ): Promise<Itinerary>;
}

export interface ContentRetriever {
  search(query: string, options?: SearchOptions): Promise<Article[]>;
}
