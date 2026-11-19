"use client";
import { useRouter } from "next/navigation";
import { useTripMutation } from "@/lib/components/use-trip-mutation";
export function DeleteItineraryButton({
  tripId,
  className,
  redirectToDashboard = false,
}: {
  tripId: string;
  className?: string;
  redirectToDashboard?: boolean;
}) {
  const router = useRouter();
  const { mutate, saving, error } = useTripMutation();
  return (
    <div>
      <button
        disabled={saving}
        type="button"
        className={className ?? "button-secondary text-red-800"}
        onClick={() => {
          if (window.confirm("Delete this itinerary and all its events? This cannot be undone."))
            void mutate(`/api/trips/${tripId}`, "DELETE", undefined, () => {
              if (redirectToDashboard) router.push("/dashboard");
            });
        }}
      >
        {saving ? "Deleting…" : "Delete itinerary"}
      </button>
      {error ? (
        <p className="error mt-3" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
