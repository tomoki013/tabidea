import { Itinerary, UserInput } from "./types";

/**
 * Encodes the plan data (input + result) into a URL-safe Base64 string.
 * We use a custom object structure to minimize size if possible,
 * but for now we simply wrap the necessary data.
 */
export function encodePlanData(input: UserInput, result: Itinerary): string {
  try {
    const data = {
      i: input,
      r: result,
    };
    const jsonString = JSON.stringify(data);
    // Encode to Base64 (handle Unicode characters)
    const base64 = btoa(
      encodeURIComponent(jsonString).replace(/%([0-9A-F]{2})/g, (match, p1) => {
        return String.fromCharCode(parseInt(p1, 16));
      })
    );
    // Make URL-safe: + -> -, / -> _, remove =
    return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  } catch (e) {
    console.error("Failed to encode plan data", e);
    return "";
  }
}

/**
 * Decodes the plan data from a URL-safe Base64 string.
 */
export function decodePlanData(
  encoded: string
): { input: UserInput; result: Itinerary } | null {
  try {
    // Restore Base64: - -> +, _ -> /, add padding
    let base64 = encoded.replace(/-/g, "+").replace(/_/g, "/");
    while (base64.length % 4) {
      base64 += "=";
    }

    // Decode from Base64 (handle Unicode characters)
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
    console.error("Failed to decode plan data", e);
    return null;
  }
}
