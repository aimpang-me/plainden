import { expect, test, vi } from "vitest";

const signInMagicLink = vi.hoisted(() =>
  vi.fn(async () => {
    throw new Error("mailbox refused the message");
  }),
);

vi.mock("next/headers", () => ({
  headers: async () => new Headers(),
}));

vi.mock("@/lib/auth/server", () => ({
  getAuth: async () => ({ api: { signInMagicLink } }),
}));

test("a magic-link failure is logged without the email address", async () => {
  const { requestMagicLink } = await import("./actions");
  const errors: unknown[][] = [];
  const spy = vi.spyOn(console, "error").mockImplementation((...args: unknown[]) => {
    errors.push(args);
  });
  try {
    await expect(requestMagicLink("ada@example.com", "turnstile-token")).resolves.toEqual({
      ok: false,
      error: "Could not send the sign-in link.",
    });
    expect(errors).toEqual([["mailbox refused the message"]]);
    expect(JSON.stringify(errors)).not.toContain("ada@example.com");
  } finally {
    spy.mockRestore();
  }
});
