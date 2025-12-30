import { Itinerary, UserInput } from "./types";
import pako from "pako";

/**
 * Encodes the plan data (input + result) into a URL-safe Base64 string using compression.
 */
export function encodePlanData(input: UserInput, result: Itinerary): string {
  try {
    const data = {
      i: input,
      r: result,
    };
    const jsonString = JSON.stringify(data);

    // Convert string to Uint8Array (UTF-8)
    const textEncoder = new TextEncoder();
    const uint8Array = textEncoder.encode(jsonString);

    // Compress using pako (deflate)
    const compressed = pako.deflate(uint8Array);

    // Convert Uint8Array to binary string
    // Using a chunked approach or reduce to avoid stack overflow on large arrays
    let binary = "";
    const len = compressed.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(compressed[i]);
    }

    // Encode to Base64
    const base64 = btoa(binary);

    // Make URL-safe: + -> -, / -> _, remove =
    return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  } catch (e) {
    console.error("Failed to encode plan data", e);
    return "";
  }
}

/**
 * Decodes the plan data from a URL-safe Base64 string.
 * Supports both new compressed format and legacy uncompressed format.
 */
export function decodePlanData(
  encoded: string
): { input: UserInput; result: Itinerary } | null {
  if (!encoded) return null;

  // Restore Base64: - -> +, _ -> /
  let base64 = encoded.replace(/-/g, "+").replace(/_/g, "/");
  while (base64.length % 4) {
    base64 += "=";
  }

  try {
    // Try to decode as new compressed format
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    // Decompress
    const decompressed = pako.inflate(bytes);

    // Decode UTF-8
    const textDecoder = new TextDecoder();
    const jsonString = textDecoder.decode(decompressed);

    const data = JSON.parse(jsonString);
    if (data.i && data.r) {
      return { input: data.i, result: data.r };
    }
    // If structure doesn't match, it might be something else, but we can't fall back to legacy
    // because legacy wouldn't survive pako.inflate usually (unless it was already zlib stream, which it wasn't)
    return null;
  } catch (e) {
    // If decompression or parsing fails, try legacy format
    // console.log("Failed to decode as compressed data, trying legacy format...", e);
    return decodePlanDataLegacy(base64);
  }
}

function decodePlanDataLegacy(
  base64: string
): { input: UserInput; result: Itinerary } | null {
  try {
    // Decode from Base64 (handle Unicode characters via percent encoding trick)
    const jsonString = decodeURIComponent(
      Array.prototype.map
        .call(atob(base64), (c: string) => {
          return "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2);
        })
        .join("")
    );
    const data = JSON.parse(jsonString);
    if (data.i && data.r) {
      return { input: data.i, result: data.r };
    }
    return null;
  } catch (e) {
    console.error("Failed to decode plan data (legacy)", e);
    return null;
  }
}
