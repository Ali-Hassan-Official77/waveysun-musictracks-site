const API_BASE =
  process.env.AUDIUS_API_BASE_URL || "https://api.audius.co/v1";

function getHeaders() {
  const apiKey = process.env.AUDIUS_API_KEY;
  const bearerToken = process.env.AUDIUS_BEARER_TOKEN;

  if (!apiKey || !bearerToken) {
    throw new Error(
      "Audius credentials are missing. Add AUDIUS_API_KEY and AUDIUS_BEARER_TOKEN to .env.local."
    );
  }

  return {
    Accept: "application/json",
    "X-API-Key": apiKey,
    Authorization: `Bearer ${bearerToken}`,
  };
}

export async function audiusFetch(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      ...getHeaders(),
      ...(options.headers || {}),
    },
    next: options.next ?? { revalidate: 60 },
  });

  const text = await response.text();

  let data;

  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    throw new Error("Audius returned an invalid JSON response.");
  }

  if (!response.ok) {
    const message =
      data?.error?.message ||
      data?.error ||
      data?.message ||
      `Audius request failed with status ${response.status}.`;

    throw new Error(String(message));
  }

  return data;
}

function getArtworkUrl(artwork) {
  if (!artwork) {
    return null;
  }

  if (typeof artwork === "string") {
    return artwork;
  }

  if (typeof artwork === "object") {
    const candidates = [
      artwork._1000x1000,
      artwork._480x480,
      artwork._150x150,
      artwork["1000x1000"],
      artwork["480x480"],
      artwork["150x150"],
      artwork.url,
      artwork.uri,
    ];

    const valid = candidates.find(
      (value) =>
        typeof value === "string" &&
        value.startsWith("http")
    );

    return valid || null;
  }

  return null;
}

export function normalizeTrack(track) {
  if (!track) {
    return null;
  }

  const artworkUrl = getArtworkUrl(track.artwork);

  return {
    id: String(track.id || ""),
    title: track.title || "Untitled",

    artist:
      track.user?.name ||
      track.user?.handle ||
      track.artist ||
      "Unknown Artist",

    artistHandle: track.user?.handle || "",

    artwork: artworkUrl,
    artworkUrl,

    duration: Number(track.duration || 0),

    genre: track.genre || "Unknown",

    mood: track.mood || "",

    playCount: Number(track.playCount || 0),

    favoriteCount: Number(track.favoriteCount || 0),

    permalink: track.permalink || "",

    description: track.description || "",

    streamable:
      track.isStreamable === undefined
        ? true
        : Boolean(track.isStreamable),

    downloadable: Boolean(track.downloadable),

    releaseDate: track.releaseDate || null,
  };
}