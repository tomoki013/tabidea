export async function getUnsplashImage(query: string): Promise<string | null> {
  const accessKey = process.env.UNSPLASH_ACCESS_KEY;
  if (!accessKey) {
    console.warn("UNSPLASH_ACCESS_KEY is not set. Using fallback image.");
    return null;
  }

  try {
    const response = await fetch(
      `https://api.unsplash.com/photos/random?query=${encodeURIComponent(
        query
      )}&orientation=landscape`,
      {
        headers: {
          Authorization: `Client-ID ${accessKey}`,
        },
      }
    );

    if (!response.ok) {
      console.error(
        `Failed to fetch image from Unsplash: ${response.status} ${response.statusText}`
      );
      return null;
    }

    const data = await response.json();
    return data.urls.regular;
  } catch (error) {
    console.error("Error fetching image from Unsplash:", error);
    return null;
  }
}
