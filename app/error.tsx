"use client";
export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <section className="panel space-y-4">
      <h1 className="page-title">We couldn’t load this plan</h1>
      <p className="muted">Check your connection and try again. Your saved itinerary is still there.</p>
      <button onClick={reset} className="button">
        Try again
      </button>
    </section>
  );
}
