export interface Article {
  title: string;
  url: string;
  content: string;
  snippet: string;
  imageUrl?: string;
}

export interface UserInput {
  destination: string;
  isDestinationDecided?: boolean;
  region: string; // "domestic" | "overseas" | "anywhere"
  dates: string;
  companions: string;
  theme: string[];
  budget: string;
  pace: string;
  freeText: string;
  travelVibe?: string; // New field for "South Island", "Resort vibe", etc.
  mustVisitPlaces?: string[]; // Optional list of specific places the user wants to visit
  hasMustVisitPlaces?: boolean; // Required for validation in Step 2
}

export interface Activity {
  time: string;
  activity: string;
  description: string;
}

export interface DayPlan {
  day: number;
  title: string;
  activities: Activity[];
}

export interface Reference {
  title: string;
  url: string;
  image?: string;
  snippet?: string;
}

export interface Itinerary {
  id: string;
  destination: string;
  description: string;
  reasoning?: string; // AI's thought process
  heroImage?: string;
  heroImagePhotographer?: string; // Unsplash photographer name
  heroImagePhotographerUrl?: string; // Unsplash photographer profile URL
  days: DayPlan[];
  references?: Reference[];
  reference_indices?: number[]; // indices of used articles in the context array
}
