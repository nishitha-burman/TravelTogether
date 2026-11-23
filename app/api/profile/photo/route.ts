import { NextResponse } from "next/server";
import { getAuthedUser } from "@/lib/api-auth";
import { photoType, PROFILE_PHOTO_LIMIT } from "@/lib/profile-photo";

export async function GET(request: Request) {
  const auth = await getAuthedUser(request);
  if (auth.error || !auth.user || !auth.supabase) return auth.error;
  const { data, error } = await auth.supabase.storage
    .from("profile-photos")
    .download(`${auth.user.id}/avatar`);
  if (error || !data) return new NextResponse(null, { status: 404 });
  return new NextResponse(data, {
    headers: {
      "Content-Type": data.type,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export async function PUT(request: Request) {
  const auth = await getAuthedUser(request);
  if (auth.error || !auth.user || !auth.supabase) return auth.error;
  if (
    Number(request.headers.get("content-length")) >
    PROFILE_PHOTO_LIMIT + 65536
  )
    return NextResponse.json(
      { error: "Choose a photo smaller than 2 MB." },
      { status: 413 },
    );
  const form = await request.formData().catch(() => null);
  const file = form?.get("photo");
  if (!(file instanceof File) || !file.size || file.size > PROFILE_PHOTO_LIMIT)
    return NextResponse.json(
      { error: "Choose a JPG, PNG or WebP photo up to 2 MB." },
      { status: 400 },
    );
  const bytes = new Uint8Array(await file.arrayBuffer());
  const type = photoType(bytes);
  if (!type || type !== file.type)
    return NextResponse.json(
      { error: "Choose a valid JPG, PNG or WebP photo." },
      { status: 400 },
    );
  const { error } = await auth.supabase.storage
    .from("profile-photos")
    .upload(`${auth.user.id}/avatar`, bytes, {
      contentType: type,
      upsert: true,
      cacheControl: "0",
    });
  if (error)
    return NextResponse.json(
      {
        error:
          "Could not upload your photo. Please retry; photo storage may need to be enabled.",
      },
      { status: 503 },
    );
  return NextResponse.json({ ok: true });
}
