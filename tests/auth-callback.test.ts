import { beforeEach, expect, test, vi } from "vitest";
import { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { GET } from "@/app/auth/callback/route";
vi.mock("@supabase/ssr", () => ({ createServerClient: vi.fn() }));
const exchange = vi.fn();
beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "public-test-key");
  exchange.mockResolvedValue({ error: null });
  vi.mocked(createServerClient).mockReturnValue({ auth: { exchangeCodeForSession: exchange } } as unknown as ReturnType<typeof createServerClient>);
});
test("email confirmation returns to the account settings and reports rejected codes", async () => {
  const request = new NextRequest("https://travel.example/auth/callback?code=valid&next=/settings/account");
  expect((await GET(request)).headers.get("location")).toBe("https://travel.example/settings/account");
  expect(exchange).toHaveBeenCalledWith("valid");
  exchange.mockResolvedValue({ error: new Error("Expired code") });
  expect((await GET(request)).headers.get("location")).toBe("https://travel.example/settings/account?emailConfirmation=error");
  expect((await GET(new NextRequest("https://travel.example/auth/callback?next=/settings/account"))).headers.get("location")).toBe("https://travel.example/settings/account?emailConfirmation=error");
});
test("confirmation never redirects to an external next destination", async () => {
  for (const next of ["//evil.example", "/\\evil.example", "https://evil.example"]) {
    const response = await GET(new NextRequest(`https://travel.example/auth/callback?code=valid&next=${encodeURIComponent(next)}`));
    expect(response.headers.get("location")).toBe("https://travel.example/dashboard");
  }
});

test("previously sent profile confirmation links now return to account settings", async () => {
  const response = await GET(new NextRequest("https://travel.example/auth/callback?code=valid&next=/profile"));
  expect(response.headers.get("location")).toBe("https://travel.example/settings/account");
});
