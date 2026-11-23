import Link from "next/link";
import { isSupabaseConfigured } from "@/lib/env";
import { requireUser } from "@/lib/trips";
import { readProfile } from "@/lib/server/profile-data";
import { readTrips } from "@/lib/server/trip-data";
import { accountTripStats } from "@/lib/profile";
import { ProfileForm } from "@/lib/components/profile-form";
import { dateLabel } from "@/lib/calendar/time";
import { demoTrip } from "@/lib/demo";
import type { ProfileRow } from "@/types/trip";

export default async function ProfilePage() {
  const scaffold = !isSupabaseConfigured();
  let profile: ProfileRow = {
    id: "demo-owner",
    display_name: "Your name",
    home_city: null,
    bio: null,
    created_at: "2026-11-16T12:00:00Z",
  };
  let joinedAt = profile.created_at;
  let userId = profile.id;
  let email: string | undefined = "traveler@example.com";
  let enabled = true;
  let trips = [demoTrip().trip, demoTrip("demo-kyoto").trip];
  if (!scaffold) {
    const { supabase, user } = await requireUser();
    userId = user.id;
    joinedAt = user.created_at;
    email = user.email;
    const [account, owned, memberships] = await Promise.all([
      readProfile(supabase, user.id),
      supabase.from("itineraries").select("id").eq("owner_id", user.id),
      supabase
        .from("itinerary_members")
        .select("itinerary_id")
        .eq("user_id", user.id),
    ]);
    if (owned.error || memberships.error)
      throw new Error("Could not load your trip statistics. Please try again.");
    profile = account.profile ?? {
      id: user.id,
      display_name: null,
      home_city: null,
      bio: null,
      created_at: user.created_at,
    };
    enabled = account.editable;
    const ids = [
      ...new Set([
        ...(owned.data ?? []).map((trip) => trip.id),
        ...(memberships.data ?? []).map((member) => member.itinerary_id),
      ]),
    ];
    trips = ids.length ? await readTrips(supabase, ids) : [];
  } else {
    trips = [trips[0], { ...trips[1], owner_id: "demo-other-owner" }];
  }
  const today = new Date().toISOString().slice(0, 10);
  const stats = accountTripStats(trips, userId, today);
  const name = profile.display_name || "Traveler";
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
  const upcoming = trips
    .filter(
      (trip) => trip.start_date && (trip.end_date ?? trip.start_date) >= today,
    )
    .sort((a, b) => a.start_date!.localeCompare(b.start_date!))
    .slice(0, 3);
  const cards = [
    { label: "Trips created", value: stats.created, detail: "Trips you own" },
    {
      label: "Collaborations",
      value: stats.collaborations,
      detail: "Trips you joined as editor or viewer",
    },
    {
      label: "Past trips",
      value: stats.past,
      detail: "Trips whose end dates have passed",
    },
    {
      label: "Upcoming & active",
      value: stats.upcoming,
      detail: "Dated trips still ahead or underway",
    },
  ];
  return (
    <div className="space-y-8">
      {scaffold ? (
        <p className="text-sm muted">
          Sample account · Statistics below are examples.
        </p>
      ) : null}
      <header className="flex flex-wrap items-start justify-between gap-5">
        <div className="flex items-center gap-4">
          <span
            aria-hidden="true"
            className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-[var(--ink)] font-serif text-2xl text-white"
          >
            {initials}
          </span>
          <div>
            <p className="eyebrow">Your profile · Private</p>
            <h1 className="page-title mt-2 break-words">{name}</h1>
            {profile.home_city ? (
              <p className="mt-2 text-sm muted">Based in {profile.home_city}</p>
            ) : null}
          </div>
        </div>
        <Link href="/dashboard" className="button-secondary">
          Your trips →
        </Link>
      </header>
      <section aria-label="Your travel statistics" className="space-y-4">
        <dl className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {cards.map((card) => (
            <div key={card.label} className="panel">
              <dt className="text-sm font-semibold muted">{card.label}</dt>
              <dd className="mt-3 font-serif text-4xl">{card.value}</dd>
              <p className="mt-2 text-xs leading-relaxed muted">
                {card.detail}
              </p>
            </div>
          ))}
        </dl>
        <p className="text-xs leading-relaxed muted">
          {stats.total} {stats.total === 1 ? "trip" : "trips"} in your account ·{" "}
          {stats.datesOpen} with dates open. Counts reflect your current trips
          and accepted memberships. Past trips are based on scheduled end dates.
        </p>
      </section>
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <ProfileForm profile={profile} enabled={enabled} scaffold={scaffold} />
        <div className="space-y-6">
          <section
            className="panel space-y-4"
            aria-labelledby="account-heading"
          >
            <h2 id="account-heading" className="section-heading">
              Your account
            </h2>
            <dl className="space-y-4 text-sm">
              <div>
                <dt className="muted">Email</dt>
                <dd className="mt-1 break-all">{email ?? "Not provided"}</dd>
              </div>
              <div>
                <dt className="muted">Member since</dt>
                <dd className="mt-1">{dateLabel(joinedAt.slice(0, 10))}</dd>
              </div>
            </dl>
            <p className="text-xs leading-relaxed muted">
              Trips you create belong to this account. Joining another trip adds
              it to Your trips; its owner manages sharing.
            </p>
          </section>
          <section
            className="panel space-y-4"
            aria-labelledby="profile-upcoming"
          >
            <h2 id="profile-upcoming" className="section-heading">
              On the horizon
            </h2>
            {upcoming.length ? (
              <ul className="divide-y divide-[var(--line)]">
                {upcoming.map((trip) => (
                  <li key={trip.id} className="py-3">
                    <Link
                      className="font-semibold underline underline-offset-4"
                      href={`/trips/${trip.id}`}
                    >
                      {trip.title}
                    </Link>
                    <p className="mt-1 text-sm muted">
                      {dateLabel(trip.start_date)} · {trip.destination}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm muted">
                No upcoming dated trips yet. Your next adventure can start with
                an idea.
              </p>
            )}
            <Link
              href="/trips/new"
              className="text-sm font-semibold underline underline-offset-4"
            >
              Plan a trip →
            </Link>
          </section>
        </div>
      </div>
    </div>
  );
}
