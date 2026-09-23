import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const API_BASE = process.env.AUDIUS_API_BASE_URL || "https://api.audius.co/v1";

function getHeaders(request) {
  const apiKey = process.env.AUDIUS_API_KEY;
  const bearer = process.env.AUDIUS_BEARER_TOKEN;
  const headers = { Accept: "audio/mpeg,audio/*;q=0.9,*/*;q=0.5" };

  if (apiKey) headers["X-API-Key"] = apiKey;
  if (bearer) headers.Authorization = `Bearer ${bearer}`;

  const range = request.headers.get("range");
  if (range) headers.Range = range;
  return headers;
}

export async function GET(request, { params }) {
  const { id } = await params;
  if (!id) return NextResponse.json({ error: "Track id is required." }, { status: 400 });

  try {
    const response = await fetch(`${API_BASE}/tracks/${encodeURIComponent(id)}/stream`, {
      headers: getHeaders(request),
      redirect: "follow",
      cache: "no-store",
    });

    if (!response.ok) {
      const message = `Audius stream request failed (${response.status}).`;
      return NextResponse.json({ error: message }, { status: response.status });
    }

    const headers = new Headers();
    for (const name of ["content-type", "content-length", "content-range", "accept-ranges", "cache-control", "etag", "last-modified"]) {
      const value = response.headers.get(name);
      if (value) headers.set(name, value);
    }
    headers.set("Cache-Control", "private, no-store");

    return new NextResponse(response.body, {
      status: response.status,
      headers,
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to stream this track." }, { status: 502 });
  }
}
