import { NextResponse } from "next/server";
import { audiusFetch, normalizeTrack } from "../../../lib/audius";

export const runtime = "nodejs";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(Math.max(Number(searchParams.get("limit") || 24), 1), 100);
    const time = searchParams.get("time") || "week";
    const genre = searchParams.get("genre");

    const query = new URLSearchParams({ limit: String(limit), time });
    if (genre && genre !== "All") query.set("genre", genre);

    const data = await audiusFetch(`/tracks/trending?${query.toString()}`, {
      next: { revalidate: 120 },
    });

    return NextResponse.json({ tracks: (data?.data || []).map(normalizeTrack) });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
