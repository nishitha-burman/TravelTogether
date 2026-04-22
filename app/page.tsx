import Link from "next/link";
import { isSupabaseConfigured } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase-server";

const features = [
  "Shared itineraries with granular permissions",
  "Interactive map markers for key locations",
  "Flexible day-by-day timeline with event-specific fields",
  "Private trips by email invite or public trips by link"
];

export default async function HomePage() {
  const supabaseEnabled = isSupabaseConfigured();
  const data = supabaseEnabled
    ? await (async () => {
        try {
          const supabase = await createSupabaseServerClient();
          return supabase.auth.getUser().then((result) => result.data);
        } catch {
          return { user: null };
        }
      })()
    : { user: null };

  return (
    <section className="space-y-8">
      <div className="rounded-2xl bg-white/90 p-10 shadow-md ring-1 ring-[#ffd2e6]">
        <p className="bg-gradient-to-r from-[#ff6a3d] to-[#ff4f8b] bg-clip-text text-sm font-semibold uppercase tracking-[0.2em] text-transparent">
          Plan trips together
        </p>
        <h1 className="mt-3 max-w-2xl text-4xl font-bold text-slate-900">Build a shared travel plan your whole group can actually use.</h1>
        <p className="mt-4 max-w-xl text-slate-700">
          TravelTogether keeps your destination, map, stays, museums, transit and daily timeline in one living itinerary.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          {data.user ? (
            <Link href="/trips/new" className="rounded-md bg-gradient-to-r from-[#ff6a3d] to-[#ff4f8b] px-5 py-2.5 font-semibold text-white shadow-sm transition hover:from-[#ff7b52] hover:to-[#ff62a0]">
              New itinerary
            </Link>
          ) : (
            <>
              <Link href="/auth/signup" className="rounded-md bg-gradient-to-r from-[#ff6a3d] to-[#ff4f8b] px-5 py-2.5 font-semibold text-white shadow-sm transition hover:from-[#ff7b52] hover:to-[#ff62a0]">
                Start planning
              </Link>
              <Link href="/auth/login" className="rounded-md border border-[#ffd2e6] bg-white px-5 py-2.5 font-semibold text-slate-800 transition hover:bg-[#fff1f7]">
                Log in
              </Link>
            </>
          )}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {features.map((feature) => (
          <article key={feature} className="rounded-xl bg-white/90 p-5 shadow-md ring-1 ring-[#ffd2e6]">
            <h2 className="font-semibold text-slate-900">{feature}</h2>
          </article>
        ))}
      </div>
    </section>
  );
}
