import pako from "pako";
import LZString from "lz-string";
import { UserInput, Itinerary } from "./types";

export function encodePlanData(input: UserInput, result: Itinerary): string {
  const data = JSON.stringify({ input, result });
  return LZString.compressToEncodedURIComponent(data);
}

export function decodePlanData(encoded: string): { input: UserInput, result: Itinerary } | null {
  if (!encoded) return null;

  // Try LZString first
  try {
    const decompressed = LZString.decompressFromEncodedURIComponent(encoded);
    if (decompressed) {
        try {
            return JSON.parse(decompressed);
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

    // In Node.js environment (e.g. tests), atob might not be available or behaves differently?
    // But this code runs in browser.
    // However, unit tests run in Node (Vitest). Node 20 has global atob.

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
