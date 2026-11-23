"use client";
import { useRouter } from "next/navigation";
import { useTripMutation } from "@/lib/components/use-trip-mutation";
export function DeleteItineraryButton({
  tripId,
  className,
  redirectToDashboard = false,
  tripTitle,
  scaffold = false,
}: {
  tripId: string;
  className?: string;
  redirectToDashboard?: boolean;
  tripTitle?: string;
  scaffold?: boolean;
}) {
  const router = useRouter();
  const { mutate, saving, error } = useTripMutation();
  return (
    <div>
      <button
        disabled={saving || scaffold}
        aria-label={tripTitle ? `Delete ${tripTitle}` : "Delete trip"}
        type="button"
        className={className ?? "button-secondary text-red-800"}
        onClick={() => {
          if (
            window.confirm(
              `Delete ${tripTitle ? `“${tripTitle}”` : "this trip"} and all its events? Everyone will lose access. This cannot be undone.`,
            )
          )
            void mutate(`/api/trips/${tripId}`, "DELETE", undefined, () => {
              if (redirectToDashboard) router.push("/dashboard");
            });
        }}
      >
        {saving ? "Deleting…" : "Delete trip"}
      </button>
      {error ? (
        <p className="error mt-3" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
