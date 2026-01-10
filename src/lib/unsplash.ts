export type UnsplashImageData = {
  url: string;
  photographer: string;
  photographerUrl: string;
};

export async function getUnsplashImage(query: string): Promise<UnsplashImageData | null> {
  console.log(`[Unsplash] Step 1: getUnsplashImage called with query: "${query}"`);

  const accessKey = process.env.UNSPLASH_ACCESS_KEY;
  if (!accessKey) {
    console.warn("[Unsplash] Step 2: UNSPLASH_ACCESS_KEY is not set. Using fallback image.");
    return null;
  }
  console.log("[Unsplash] Step 2: UNSPLASH_ACCESS_KEY found");

  try {
    const encodedQuery = encodeURIComponent(query);
    const url = `https://api.unsplash.com/photos/random?query=${encodedQuery}&orientation=landscape`;
    console.log(`[Unsplash] Step 3: Fetching from URL: ${url}`);

    const fetchStartTime = Date.now();
    const response = await fetch(url, {
      headers: {
        Authorization: `Client-ID ${accessKey}`,
      },
    });
    const fetchDuration = Date.now() - fetchStartTime;
    console.log(`[Unsplash] Step 4: Fetch completed in ${fetchDuration}ms. Status: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      console.error(
        `[Unsplash] Step 5: Failed to fetch image from Unsplash: ${response.status} ${response.statusText}`
      );
      return null;
    }

    console.log("[Unsplash] Step 5: Parsing response JSON...");
    const data = await response.json();
    const imageUrl = data.urls.regular;
    const photographerName = data.user?.name || "Unknown";
    const photographerUsername = data.user?.username || "";
    const photographerUrl = photographerUsername
      ? `https://unsplash.com/@${photographerUsername}?utm_source=Tabidea&utm_medium=referral`
      : `https://unsplash.com/?utm_source=Tabidea&utm_medium=referral`;

    console.log(`[Unsplash] Step 6: Successfully retrieved image URL: ${imageUrl}`);
    console.log(`[Unsplash] Image details - ID: ${data.id}, Photographer: ${photographerName}, Dimensions: ${data.width}x${data.height}`);

    return {
      url: imageUrl,
      photographer: photographerName,
      photographerUrl,
    };
  } catch (error) {
    console.error("[Unsplash] Error fetching image from Unsplash:", error);
    console.error(`[Unsplash] Error details - Type: ${error instanceof Error ? error.constructor.name : typeof error}, Message: ${error instanceof Error ? error.message : String(error)}`);
    return null;
  }
}
