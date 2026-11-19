import { NextResponse } from "next/server";
import { z } from "zod";
import { timezoneSchema } from "@/lib/schemas";
import { missingFunction } from "@/lib/server/compatibility";
import { mutationError } from "@/lib/api-response";
import { getAuthedUser } from "@/lib/api-auth";

const createTripSchema = z.object({
  timezone: timezoneSchema.nullable().optional(),
  title: z.string().trim().min(1).max(120),
  city: z.string().min(1).max(120),
  planningMode: z.enum(["days", "date_range"]),
  tripLengthDays: z.number().int().min(1).max(60).optional(),
  startDate: z.string().date().optional(),
  endDate: z.string().date().optional(),
  isPublic: z.boolean(),
  themeImageUrl: z.string().url().nullable().optional(),
});

export async function POST(request: Request) {
  const auth = await getAuthedUser(request);
  if (auth.error || !auth.user) {
    return auth.error;
  }

  const body = await request.json().catch(() => null);
  const parsed = createTripSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid payload" },
      { status: 400 },
    );
  }

  let tripLengthDays = parsed.data.tripLengthDays ?? 0;
  if (parsed.data.planningMode === "date_range") {
    if (!parsed.data.startDate || !parsed.data.endDate) {
      return NextResponse.json(
        { error: "Start and end date are required for date range mode" },
        { status: 400 },
      );
    }
    const startDate = new Date(`${parsed.data.startDate}T00:00:00Z`);
    const endDate = new Date(`${parsed.data.endDate}T00:00:00Z`);
    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime()) || endDate < startDate) {
      return NextResponse.json({ error: "Invalid date range" }, { status: 400 });
    }
    tripLengthDays = Math.floor((endDate.getTime() - startDate.getTime()) / 86_400_000) + 1;
    if (tripLengthDays < 1 || tripLengthDays > 120) {
      return NextResponse.json({ error: "Date range must be between 1 and 120 days" }, { status: 400 });
    }
  } else if (!tripLengthDays || tripLengthDays < 1 || tripLengthDays > 60) {
    return NextResponse.json({ error: "Trip length must be between 1 and 60 days" }, { status: 400 });
  }

  const atomic = await auth.supabase.rpc("create_trip_plan", {
    trip_title: parsed.data.title,
    trip_city: parsed.data.city,
    total_days: tripLengthDays,
    first_date: parsed.data.planningMode === "date_range" ? parsed.data.startDate : null,
    trip_timezone: parsed.data.timezone ?? null,
    public_trip: parsed.data.isPublic,
    image_url: parsed.data.themeImageUrl ?? null,
  });
  if (!atomic.error) return NextResponse.json({ id: atomic.data }, { status: 201 });
  if (!missingFunction(atomic.error) || parsed.data.timezone)
    return mutationError(atomic.error, "Could not create your trip. Please retry.");
  // Compatibility: legacy creation remains available when no timezone was requested.
  const publicSlug = crypto.randomUUID();

  const { data: trip, error } = await auth.supabase
    .from("itineraries")
    .insert({
      owner_id: auth.user.id,
      title: parsed.data.title,
      city: parsed.data.city,
      destination: parsed.data.city,
      planning_mode: parsed.data.planningMode,
      start_date: parsed.data.planningMode === "date_range" ? (parsed.data.startDate ?? null) : null,
      end_date: parsed.data.planningMode === "date_range" ? (parsed.data.endDate ?? null) : null,
      trip_length_days: tripLengthDays,
      is_public: parsed.data.isPublic,
      public_slug: publicSlug,
      theme_image_url: parsed.data.themeImageUrl ?? null,
    })
    .select("id")
    .single();

  let createdTrip = trip;
  if ((error || !createdTrip) && error?.message?.toLowerCase().includes("column")) {
    const fallback = await auth.supabase
      .from("itineraries")
      .insert({
        owner_id: auth.user.id,
        title: parsed.data.title,
        destination: parsed.data.city,
        trip_length_days: tripLengthDays,
        is_public: parsed.data.isPublic,
        public_slug: publicSlug,
        theme_image_url: parsed.data.themeImageUrl ?? null,
      })
      .select("id")
      .single();
    if (!fallback.error && fallback.data) {
      createdTrip = fallback.data;
    } else {
      return NextResponse.json(
        { error: fallback.error?.message ?? "Failed to create trip" },
        { status: 400 },
      );
    }
  } else if (error || !createdTrip) {
    return NextResponse.json({ error: error?.message ?? "Failed to create trip" }, { status: 400 });
  }

  const dayRows = Array.from({ length: tripLengthDays }).map((_, index) => {
    let dayDate: string | null = null;
    if (parsed.data.planningMode === "date_range" && parsed.data.startDate) {
      const date = new Date(`${parsed.data.startDate}T00:00:00Z`);
      date.setUTCDate(date.getUTCDate() + index);
      dayDate = date.toISOString().slice(0, 10);
    }

    return {
      itinerary_id: createdTrip.id,
      day_number: index + 1,
      label: null,
      day_date: dayDate,
    };
  });

  let dayInsert = await auth.supabase.from("trip_days").insert(dayRows);
  if (dayInsert.error && dayInsert.error.message.toLowerCase().includes("day_date")) {
    const fallbackDayRows = dayRows.map((row) => ({
      itinerary_id: row.itinerary_id,
      day_number: row.day_number,
      label: row.label,
    }));
    dayInsert = await auth.supabase.from("trip_days").insert(fallbackDayRows);
  }

  if (dayInsert.error) {
    const cleanup = await auth.supabase
      .from("itineraries")
      .delete()
      .eq("id", createdTrip.id)
      .eq("owner_id", auth.user.id);
    return NextResponse.json(
      {
        error: cleanup.error
          ? "The trip could not be completed. Open your trips to review it before retrying."
          : "Could not create the trip days. Please retry.",
      },
      { status: 500 },
    );
  }
  return NextResponse.json({ id: createdTrip.id }, { status: 201 });
}
