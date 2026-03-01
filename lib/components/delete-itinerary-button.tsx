"use client";

import { useRouter } from "next/navigation";
import { getAuthJsonHeaders } from "@/lib/client-api";

type DeleteItineraryButtonProps = {
  tripId: string;
  className?: string;
  redirectToDashboard?: boolean;
};

export function DeleteItineraryButton({
  tripId,
  className,
  redirectToDashboard = false
}: DeleteItineraryButtonProps) {
  const router = useRouter();

  async function onDelete() {
    const confirmed = window.confirm("Are you sure you want to delete this itinerary? This cannot be undone.");
    if (!confirmed) return;

    const response = await fetch(`/api/trips/${tripId}`, {
      method: "DELETE",
      headers: await getAuthJsonHeaders()
    });

    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as { error?: string };
      alert(body.error ?? "Failed to delete itinerary");
      return;
    }

    if (redirectToDashboard) {
      router.push("/dashboard");
    } else {
      router.refresh();
    }
  }

  return (
    <button
      type="button"
      onClick={onDelete}
      className={
        className ??
        "rounded-md border border-red-300 px-3 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-50"
      }
    >
      Delete itinerary
    </button>
  );
}
