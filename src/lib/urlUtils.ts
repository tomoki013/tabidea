import pako from "pako";
import LZString from "lz-string";
import { UserInput, Itinerary, Reference } from "./types";

// Minified structures for URL compression
interface MinifiedInput {
  d: string;   // dates
  t: string[]; // theme
}

interface MinifiedReference {
  t: string;   // title
  u: string;   // url
  i?: string;  // image
}

interface MinifiedItinerary {
  id: string;
  dst: string; // destination
  dsc: string; // description
  hi?: string; // heroImage
  days: {
    d: number; // day
    t: string; // title
    a: {       // activities
      t: string; // time
      a: string; // activity
      d: string; // description
    }[];
  }[];
  refs?: MinifiedReference[];
}

interface MinifiedData {
  v: 1; // version
  in: MinifiedInput;
  res: MinifiedItinerary;
}

export function encodePlanData(input: UserInput, result: Itinerary): string {
  // Create minified version
  const minInput: MinifiedInput = {
    d: input.dates,
    t: input.theme,
  };

  const minResult: MinifiedItinerary = {
    id: result.id,
    dst: result.destination,
    dsc: result.description,
    hi: result.heroImage,
    days: result.days.map(d => ({
      d: d.day,
      t: d.title,
      a: d.activities.map(act => ({
        t: act.time,
        a: act.activity,
        d: act.description
      }))
    })),
    refs: result.references?.map(ref => ({
      t: ref.title,
      u: ref.url,
      i: ref.image
    }))
  };

  const data: MinifiedData = {
    v: 1,
    in: minInput,
    res: minResult
  };

  const stringified = JSON.stringify(data);
  return LZString.compressToEncodedURIComponent(stringified);
}

export function decodePlanData(encoded: string): { input: UserInput, result: Itinerary } | null {
  if (!encoded) return null;

  // Try LZString first
  try {
    const decompressed = LZString.decompressFromEncodedURIComponent(encoded);
    if (decompressed) {
        try {
            const data = JSON.parse(decompressed);

            // Check if it's the new minified format (has version 'v')
            if (data.v === 1 && data.in && data.res) {
                return hydrateMinifiedData(data);
            }

            // Check if it's the old format (has 'input' and 'result')
            if (data.input && data.result) {
                return data;
            }

            // Unknown format
            return null;
        } catch (e) {
            // Not valid JSON, ignore
        }
    }
  } catch (e) {
      // Ignore LZString error
  }

  // Fallback to legacy pako (browser-compatible)
  try {
    // Decode base64url to Uint8Array without Buffer
    // base64url: - -> +, _ -> /, remove padding
    let base64 = encoded.replace(/-/g, "+").replace(/_/g, "/");
    const pad = base64.length % 4;
    if (pad) {
      if (pad === 1) {
        throw new Error("Invalid base64 length");
      }
      base64 += new Array(5 - pad).join("=");
    }

    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }

    const decompressed = pako.inflate(bytes, { to: "string" });
    return JSON.parse(decompressed);
  } catch (e) {
    // console.error("Failed to decode plan data:", e);
    return null;
  }
}

function hydrateMinifiedData(data: MinifiedData): { input: UserInput, result: Itinerary } {
    const { in: minInput, res: minResult } = data;

    // Hydrate Input
    const input: UserInput = {
        dates: minInput.d,
        theme: minInput.t,
        destination: minResult.dst,
        region: "anywhere", // Default
        isDestinationDecided: true,
        companions: "any", // Default
        budget: "any", // Default
        pace: "any", // Default
        freeText: "", // Default
        travelVibe: "" // Default
    };

    // Hydrate Result
    const result: Itinerary = {
        id: minResult.id,
        destination: minResult.dst,
        description: minResult.dsc,
        heroImage: minResult.hi,
        days: minResult.days.map(d => ({
            day: d.d,
            title: d.t,
            activities: d.a.map(act => ({
                time: act.t,
                activity: act.a,
                description: act.d
            }))
        })),
        references: minResult.refs?.map(ref => ({
            title: ref.t,
            url: ref.u,
            image: ref.i
        })) || [],
        // reasoning and reference_indices are dropped
    };

    return { input, result };
}
