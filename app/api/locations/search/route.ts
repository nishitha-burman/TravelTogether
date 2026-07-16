import { NextResponse } from "next/server";
import { z } from "zod";

const querySchema = z.object({
  q: z.string().trim().min(1).max(120),
  city: z.string().trim().min(1).max(120).optional(),
  kind: z.enum(["destination", "place"]).default("destination")
});

type NominatimResult = {
  place_id: number;
  name?: string;
  display_name: string;
  lat: string;
  lon: string;
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
  const parsed = querySchema.safeParse({
    q: url.searchParams.get("q") ?? "",
    city: url.searchParams.get("city") ?? undefined,
    kind: url.searchParams.get("kind") ?? "destination"
  });

  if (!parsed.success) {
    return NextResponse.json({ suggestions: [] });
  }

  const upstreamUrl = new URL("https://nominatim.openstreetmap.org/search");
  const scopedQuery = parsed.data.city ? `${parsed.data.q}, ${parsed.data.city}` : parsed.data.q;
  upstreamUrl.searchParams.set("q", scopedQuery);
  upstreamUrl.searchParams.set("format", "jsonv2");
  upstreamUrl.searchParams.set("addressdetails", "1");
  upstreamUrl.searchParams.set("limit", "6");

  try {
    const response = await fetch(upstreamUrl.toString(), {
      headers: {
        "User-Agent": "TravelTogether/1.0 DestinationAutocomplete",
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
        const displayParts = result.display_name.split(",").map((part) => part.trim()).filter(Boolean);
        const location = parsed.data.kind === "place"
          ? result.name ?? displayParts[0] ?? ""
          : result.address?.city ??
            result.address?.town ??
            result.address?.village ??
            result.address?.municipality ??
            result.address?.county ??
            result.address?.state ??
            displayParts[0] ??
            "";
        const country = parsed.data.kind === "place"
          ? displayParts.slice(1).join(", ") || result.address?.country || "Unknown location"
          : result.address?.country ?? "Unknown country";
        const label = `${location}, ${country}`;
        const latitude = Number(result.lat);
        const longitude = Number(result.lon);

        return {
          id: String(result.place_id),
          location,
          country,
          label,
          latitude,
          longitude
        };
      })
      .filter((item) => {
        if (!item.location || !Number.isFinite(item.latitude) || !Number.isFinite(item.longitude) || seenLabels.has(item.label)) {
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
