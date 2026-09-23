import { NextResponse } from "next/server";
import { audiusFetch, normalizeTrack } from "../../../../lib/audius";

export const runtime = "nodejs";

export async function GET(_request, { params }) {
  try {
    const { id } = await params;
    const data = await audiusFetch(`/tracks/${encodeURIComponent(id)}`, {
      next: { revalidate: 300 },
    });
    return NextResponse.json({ track: normalizeTrack(data?.data) });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
