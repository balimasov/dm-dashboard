import { NextResponse } from "next/server";
import type { ZodType } from "zod";

/**
 * Parses and validates a route handler's JSON body — the same three lines
 * (`req.json().catch(() => null)`, `schema.safeParse`, a 400
 * `NextResponse.json({ error })` on failure) that were hand-repeated at the
 * top of every route that accepts a body. Returns a discriminated union
 * rather than throwing, so the call site stays an explicit one-liner
 * mirroring `requireRole`'s own style: `const parsed = await
 * parseJsonBody(req, schema); if ("error" in parsed) return parsed.error;`
 */
export async function parseJsonBody<T>(
  req: Request,
  schema: ZodType<T>,
  errorMessage = "Invalid request body."
): Promise<{ data: T } | { error: NextResponse }> {
  const body = await req.json().catch(() => null);
  const result = schema.safeParse(body);
  if (!result.success) {
    return { error: NextResponse.json({ error: errorMessage }, { status: 400 }) };
  }
  return { data: result.data };
}
