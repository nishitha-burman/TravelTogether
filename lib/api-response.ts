import { NextResponse } from "next/server";
import { missingFunction } from "@/lib/server/compatibility";
export function mutationError(
  error: { code?: string } | null,
  message = "Could not save. Please try again.",
) {
  if (missingFunction(error))
    return NextResponse.json(
      {
        error: "This action is temporarily unavailable. Ask the trip owner to contact support.",
        code: "UPGRADE_REQUIRED",
      },
      { status: 503 },
    );
  const status = error?.code === "42501" ? 403 : error?.code === "P0002" ? 404 : 400;
  return NextResponse.json({ error: message }, { status });
}
