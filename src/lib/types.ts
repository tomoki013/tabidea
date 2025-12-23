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
}

export interface UserInput {
  destination: string;
  dates: string;
  companions: string;
  theme: string[];
}
