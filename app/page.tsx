import Image from "next/image";
import Link from "next/link";
import { isSupabaseConfigured } from "@/lib/env";
export default function HomePage() {
  const enabled = isSupabaseConfigured();
  return (
    <section className="space-y-14">
      <div className="grid items-center gap-8 py-4 md:grid-cols-2 md:gap-14">
        <div className="space-y-6">
          <p className="eyebrow">From a loose idea to a day well spent</p>
          <h1 className="page-title max-w-md text-4xl">
            One shared plan.
            <br />
            Room for everyone.
          </h1>
          <p className="max-w-md leading-relaxed muted">
            Gather the places you want to go, shape each day together, and take a dated copy into your own
            calendar.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href={enabled ? "/trips/new" : "/dashboard"} className="button">
              {enabled ? "Plan a trip" : "Explore a sample trip"}
            </Link>
            <Link href={enabled ? "/auth/login" : "/trips/new"} className="text-button">
              {enabled ? "Open your trips" : "Try the planning form"}
            </Link>
          </div>
        </div>
        <figure>
          <div className="relative h-80 overflow-hidden rounded-sm md:h-96">
            <Image
              src="https://images.unsplash.com/photo-1533105079780-92b9be482077?q=80&w=1200&auto=format&fit=crop"
              alt="Sunlit coastal buildings overlooking the sea"
              fill
              priority
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 50vw"
            />
          </div>
          <figcaption className="mt-3 text-xs muted">
            A little structure. More time to look around.
          </figcaption>
        </figure>
      </div>
      <div className="grid gap-8 border-t border-[var(--line)] pt-8 md:grid-cols-3">
        {[
          [
            "01",
            "Start with the possibilities",
            "Choose a destination and a few days. Add dates when you know them.",
          ],
          [
            "02",
            "Make the plan together",
            "Invite editors to help with the itinerary, or viewers to follow along. Booking details stay with the group.",
          ],
          [
            "03",
            "Take your days with you",
            "Check dates and timezone, then download a calendar snapshot. Download a fresh copy when the plan changes.",
          ],
        ].map(([n, title, copy]) => (
          <article key={n}>
            <p className="eyebrow">{n}</p>
            <h2 className="mt-3 text-lg font-semibold">{title}</h2>
            <p className="mt-2 text-sm leading-relaxed muted">{copy}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
