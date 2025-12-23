import { Itinerary } from "@/lib/types";

export interface Article {
  title: string;
  url: string;
  content: string;
  snippet: string;
  imageUrl?: string;
}

export interface AIService {
  generateItinerary(prompt: string, context: Article[]): Promise<Itinerary>;
  chat(message: string, context: Itinerary): Promise<string>;
}

export interface ContentRetriever {
  search(query: string): Promise<Article[]>;
}
