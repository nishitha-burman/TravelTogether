import { redirect } from "next/navigation";
import { isSupabaseConfigured } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { CreateTripForm } from "@/lib/components/create-trip-form";

export default async function NewTripPage() {
  const enabled = isSupabaseConfigured();

  if (enabled) {
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase.auth.getUser();

    if (!data.user) {
      redirect("/auth/login");
    }
  }

  return (
    <section className="mx-auto max-w-2xl space-y-4">
      <h1 className="text-3xl font-bold text-slate-900">Create itinerary</h1>
      {!enabled ? (
        <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Scaffold mode: form is preview-only until Supabase is configured.
        </p>
      ) : null}
      <p className="text-slate-600">
        Start with destination and length. You can add map markers and timeline events right after creation.
      </p>
      <CreateTripForm enabled={enabled} />
    </section>
  );
}
