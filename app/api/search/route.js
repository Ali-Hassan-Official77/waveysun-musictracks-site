import { NextResponse } from "next/server";
import { audiusFetch, normalizeTrack } from "../../../lib/audius";

export const runtime = "nodejs";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q")?.trim();
    if (!q) return NextResponse.json({ tracks: [] });

    const limit = Math.min(Math.max(Number(searchParams.get("limit") || 24), 1), 100);
    const sortMethod = searchParams.get("sort") || "relevant";

    const query = new URLSearchParams({
      query: q,
      limit: String(limit),
      sort_method: sortMethod,
    });

    const data = await audiusFetch(`/tracks/search?${query.toString()}`, {
      next: { revalidate: 30 },
    });

    return NextResponse.json({ tracks: (data?.data || []).map(normalizeTrack) });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
