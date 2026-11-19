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
      <h1 className="page-title">Start a trip</h1>
      {!enabled ? (
        <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Sample planning form · Saving is disabled in this preview.
        </p>
      ) : null}
      <p className="text-slate-700">
        A destination and a few days are enough. Add dates, places and the rest of the group as the plan takes
        shape.
      </p>
      <CreateTripForm enabled={enabled} />
    </section>
  );
}
