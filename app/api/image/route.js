import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isAllowedHost(hostname) {
  const host = hostname.toLowerCase();

  return (
    host === "audius.co" ||
    host.endsWith(".audius.co") ||
    host === "audius.org" ||
    host.endsWith(".audius.org") ||
    host === "open-audio-validator.com" ||
    host.endsWith(".open-audio-validator.com")
  );
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);

  const imageUrl =
    searchParams.get("url") ||
    searchParams.get("src");

  if (!imageUrl) {
    return NextResponse.json(
      {
        error: "Missing image URL.",
      },
      {
        status: 400,
      }
    );
  }

  let parsedUrl;

  try {
    parsedUrl = new URL(imageUrl);
  } catch {
    return NextResponse.json(
      {
        error: "Invalid image URL.",
      },
      {
        status: 400,
      }
    );
  }

  if (parsedUrl.protocol !== "https:") {
    return NextResponse.json(
      {
        error: "Only HTTPS image URLs are allowed.",
      },
      {
        status: 400,
      }
    );
  }

  if (!isAllowedHost(parsedUrl.hostname)) {
    return NextResponse.json(
      {
        error: "Image host is not allowed.",
        host: parsedUrl.hostname,
      },
      {
        status: 403,
      }
    );
  }

  try {
    const response = await fetch(parsedUrl.toString(), {
      method: "GET",

      headers: {
        Accept:
          "image/avif,image/webp,image/apng,image/jpeg,image/png,image/*,*/*;q=0.8",

        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/153.0.0.0 Safari/537.36",

        Referer: "https://audius.co/",
      },

      cache: "no-store",
    });

    if (!response.ok) {
      return NextResponse.json(
        {
          error: `Image server returned ${response.status}.`,
          host: parsedUrl.hostname,
        },
        {
          status: response.status,
        }
      );
    }

    const contentType =
      response.headers.get("content-type") ||
      "image/jpeg";

    if (!contentType.startsWith("image/")) {
      return NextResponse.json(
        {
          error: "Remote resource is not an image.",
          contentType,
        },
        {
          status: 415,
        }
      );
    }

    const body = await response.arrayBuffer();

    return new NextResponse(body, {
      status: 200,

      headers: {
        "Content-Type": contentType,

        "Cache-Control":
          "public, max-age=86400, stale-while-revalidate=604800",

        "X-Content-Type-Options": "nosniff",

        "Cross-Origin-Resource-Policy":
          "cross-origin",
      },
    });
  } catch (error) {
    console.error(
      "SoundWave image proxy error:",
      error
    );

    return NextResponse.json(
      {
        error: "Unable to fetch artwork.",
      },
      {
        status: 502,
      }
    );
  }
}