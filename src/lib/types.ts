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
  image: string;
  snippet: string;
}

export interface Itinerary {
  id: string;
  destination: string;
  heroImage: string;
  description: string;
  days: DayPlan[];
  references: Reference[];
  reasoning?: string;
}

export interface UserInput {
  destination: string;
  isDestinationDecided?: boolean;
  region?: string; // For when destination is not decided (e.g. "domestic", "overseas")
  dates: string;
  companions: string;
  theme: string[];
  freeText?: string;
  budget?: string;
  pace?: string;
}
