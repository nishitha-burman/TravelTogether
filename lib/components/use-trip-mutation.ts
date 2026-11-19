"use client";
import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { getAuthJsonHeaders } from "@/lib/client-api";
export function useTripMutation() {
  const router = useRouter();
  const locked = useRef(false);
  const [saving, setSaving] = useState(false);
  const [refreshing, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  async function mutate(url: string, method: string, body?: unknown, onSuccess?: () => void) {
    if (locked.current || refreshing) return false;
    locked.current = true;
    setSaving(true);
    setError(null);
    setStatus("Saving…");
    try {
      const response = await fetch(url, {
        method,
        headers: await getAuthJsonHeaders(),
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      const data = await response.json().catch(() => {
        throw new Error("Could not read the response. Refresh to check before retrying.");
      });
      if (!response.ok) throw new Error(data.error || "Could not save. Please retry.");
      onSuccess?.();
      setStatus("Saved");
      startTransition(() => router.refresh());
      return true;
    } catch (e) {
      setError(
        e instanceof TypeError
          ? "Connection lost. Your input is still here. Check the itinerary before retrying."
          : e instanceof Error
            ? e.message
            : "Could not save. Please retry.",
      );
      setStatus("");
      return false;
    } finally {
      locked.current = false;
      setSaving(false);
    }
  }
  return { mutate, saving: saving || refreshing, error, status };
}
