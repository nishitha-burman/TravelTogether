import { NextResponse } from "next/server";
import { z } from "zod";

const querySchema = z.object({
  q: z.string().trim().min(1).max(120)
});

type NominatimResult = {
  place_id: number;
  display_name: string;
  address?: {
    city?: string;
    town?: string;
    village?: string;
    municipality?: string;
    county?: string;
    state?: string;
    country?: string;
  };
};

export async function GET(request: Request) {
  const url = new URL(request.url);
  const parsed = querySchema.safeParse({ q: url.searchParams.get("q") ?? "" });

  if (!parsed.success) {
    return NextResponse.json({ suggestions: [] });
  }

  const upstreamUrl = new URL("https://nominatim.openstreetmap.org/search");
  upstreamUrl.searchParams.set("q", parsed.data.q);
  upstreamUrl.searchParams.set("format", "jsonv2");
  upstreamUrl.searchParams.set("addressdetails", "1");
  upstreamUrl.searchParams.set("limit", "6");

  try {
    const response = await fetch(upstreamUrl.toString(), {
      headers: {
        "User-Agent": "TripTogether/1.0 DestinationAutocomplete",
        "Accept-Language": "en"
      },
      cache: "no-store"
    });

    if (!response.ok) {
      return NextResponse.json({ suggestions: [] }, { status: 502 });
    }

    const results = (await response.json()) as NominatimResult[];
    const seenLabels = new Set<string>();
    const suggestions = results
      .map((result) => {
        const location =
          result.address?.city ??
          result.address?.town ??
          result.address?.village ??
          result.address?.municipality ??
          result.address?.county ??
          result.address?.state ??
          result.display_name.split(",")[0]?.trim() ??
          "";
        const country = result.address?.country ?? "Unknown country";
        const label = `${location}, ${country}`;

        return {
          id: String(result.place_id),
          location,
          country,
          label
        };
      })
      .filter((item) => {
        if (!item.location || seenLabels.has(item.label)) {
          return false;
        }
        seenLabels.add(item.label);
        return true;
      });

    return NextResponse.json({ suggestions });
  } catch {
    return NextResponse.json({ suggestions: [] }, { status: 502 });
  }
}
