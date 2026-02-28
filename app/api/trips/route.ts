import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthedUser } from "@/lib/api-auth";

const createTripSchema = z.object({
  title: z.string().min(1).max(120),
  destination: z.string().min(1).max(120),
  tripLengthDays: z.number().int().min(1).max(60),
  isPublic: z.boolean(),
  themeImageUrl: z.string().url().nullable().optional()
});

export async function POST(request: Request) {
  const auth = await getAuthedUser(request);
  if (auth.error || !auth.user) {
    return auth.error;
  }

  const body = await request.json();
  const parsed = createTripSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid payload" }, { status: 400 });
  }

  const publicSlug = crypto.randomUUID().slice(0, 8);

  const { data: trip, error } = await auth.supabase
    .from("itineraries")
    .insert({
      owner_id: auth.user.id,
      title: parsed.data.title,
      destination: parsed.data.destination,
      trip_length_days: parsed.data.tripLengthDays,
      is_public: parsed.data.isPublic,
      public_slug: publicSlug,
      theme_image_url: parsed.data.themeImageUrl ?? null
    })
    .select("id")
    .single();

  if (error || !trip) {
    return NextResponse.json({ error: error?.message ?? "Failed to create trip" }, { status: 400 });
  }

  const dayRows = Array.from({ length: parsed.data.tripLengthDays }).map((_, index) => ({
    itinerary_id: trip.id,
    day_number: index + 1,
    label: null
  }));

  await auth.supabase.from("trip_days").insert(dayRows);

  return NextResponse.json({ id: trip.id }, { status: 201 });
}
