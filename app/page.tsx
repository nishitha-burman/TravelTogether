import Link from "next/link";

const features = [
  "Shared itineraries with granular permissions",
  "Interactive map markers for key locations",
  "Flexible day-by-day timeline with event-specific fields",
  "Private trips by email invite or public trips by link"
];

export default function HomePage() {
  return (
    <section className="space-y-8">
      <div className="rounded-2xl bg-white p-10 shadow-sm ring-1 ring-slate-200">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-600">Plan trips together</p>
        <h1 className="mt-3 max-w-2xl text-4xl font-bold text-slate-900">Build a shared travel plan your whole group can actually use.</h1>
        <p className="mt-4 max-w-xl text-slate-600">
          TripTogether keeps your destination, map, stays, museums, transit and daily timeline in one living itinerary.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/auth/signup" className="rounded-md bg-brand-600 px-5 py-2.5 font-semibold text-white hover:bg-brand-500">
            Start planning
          </Link>
          <Link href="/auth/login" className="rounded-md border border-slate-300 px-5 py-2.5 font-semibold text-slate-700 hover:bg-slate-50">
            Log in
          </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {features.map((feature) => (
          <article key={feature} className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <h2 className="font-semibold text-slate-900">{feature}</h2>
          </article>
        ))}
      </div>
    </section>
  );
}
