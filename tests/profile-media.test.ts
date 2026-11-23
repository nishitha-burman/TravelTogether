import { beforeEach, expect, test, vi } from "vitest";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { getAuthedUser } from "@/lib/api-auth";
import { GET, PUT } from "@/app/api/profile/photo/route";
import { requestEmailChange } from "@/lib/account-email";
import { PROFILE_PHOTO_LIMIT } from "@/lib/profile-photo";

vi.mock("@/lib/api-auth", () => ({ getAuthedUser: vi.fn() }));
const upload = vi.fn(),
  download = vi.fn(),
  from = vi.fn();
const client = {
  storage: { from },
  auth: { updateUser: vi.fn() },
} as unknown as SupabaseClient;
beforeEach(() => {
  vi.clearAllMocks();
  from.mockReturnValue({ upload, download });
  upload.mockResolvedValue({ error: null });
  vi.mocked(getAuthedUser).mockResolvedValue({
    supabase: client,
    user: { id: "me" },
    error: null,
  } as Awaited<ReturnType<typeof getAuthedUser>>);
});
function photo(bytes: Uint8Array, type = "image/png") {
  const form = new FormData();
  form.set("photo", new File([bytes as BlobPart], "photo.png", { type }));
  form.set("userId", "someone-else");
  return new Request("http://localhost/api/profile/photo", {
    method: "PUT",
    body: form,
  });
}
const png = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
test("photo upload derives path from authentication and rejects invalid images and sizes", async () => {
  expect((await PUT(photo(png))).status).toBe(200);
  expect(from).toHaveBeenCalledWith("profile-photos");
  expect(upload).toHaveBeenCalledWith("me/avatar", png, {
    contentType: "image/png",
    upsert: true,
    cacheControl: "0",
  });
  upload.mockClear();
  for (const request of [
    photo(new TextEncoder().encode("<svg>")),
    photo(png, "image/jpeg"),
    photo(new Uint8Array(PROFILE_PHOTO_LIMIT + 1)),
  ])
    expect((await PUT(request)).status).toBeGreaterThanOrEqual(400);
  expect(upload).not.toHaveBeenCalled();
});
test("photo responses require auth, use private caching and never accept another account ID", async () => {
  download.mockResolvedValue({
    data: new Blob([png], { type: "image/png" }),
    error: null,
  });
  const result = await GET(
    new Request("http://localhost/api/profile/photo?userId=someone-else"),
  );
  expect(download).toHaveBeenCalledWith("me/avatar");
  expect(result.headers.get("cache-control")).toBe("private, no-store");
  expect(result.headers.get("x-content-type-options")).toBe("nosniff");
  vi.mocked(getAuthedUser).mockResolvedValue({
    supabase: client,
    user: null,
    error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
  });
  expect(
    (await GET(new Request("http://localhost/api/profile/photo")))?.status,
  ).toBe(401);
  expect((await PUT(photo(png)))?.status).toBe(401);
});
test("email change uses Auth with a profile confirmation return and retains service errors", async () => {
  vi.mocked(client.auth.updateUser).mockResolvedValue({
    data: { user: { id: "me", email: "old@example.test", new_email: "new@example.test" } as User },
    error: null,
  });
  await requestEmailChange(
    client,
    " new@example.test ",
    "old@example.test",
    "https://travel.example",
  );
  expect(client.auth.updateUser).toHaveBeenCalledWith(
    { email: "new@example.test" },
    { emailRedirectTo: "https://travel.example/auth/callback?next=/profile" },
  );
  vi.mocked(client.auth.updateUser).mockClear();
  await expect(
    requestEmailChange(
      client,
      "invalid",
      "old@example.test",
      "https://travel.example",
    ),
  ).rejects.toThrow("valid email");
  await expect(
    requestEmailChange(
      client,
      "OLD@example.test",
      "old@example.test",
      "https://travel.example",
    ),
  ).rejects.toThrow("different email");
  expect(client.auth.updateUser).not.toHaveBeenCalled();
  vi.mocked(client.auth.updateUser).mockResolvedValue({
    data: { user: null },
    error: { message: "Too many requests" },
  } as Awaited<ReturnType<SupabaseClient["auth"]["updateUser"]>>);
  await expect(
    requestEmailChange(
      client,
      "new@example.test",
      "old@example.test",
      "https://travel.example",
    ),
  ).rejects.toThrow("Too many requests");
});
