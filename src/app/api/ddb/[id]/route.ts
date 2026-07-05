import { NextResponse } from "next/server";

export async function GET(_req: Request, ctx: RouteContext<"/api/ddb/[id]">) {
  const { id } = await ctx.params;

  if (!/^\d+$/.test(id)) {
    return NextResponse.json({ error: "Invalid character ID." }, { status: 400 });
  }

  let upstream: Response;
  try {
    upstream = await fetch(`https://character-service.dndbeyond.com/character/v5/character/${id}`, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; dm-dashboard)" },
      cache: "no-store",
    });
  } catch {
    return NextResponse.json(
      { error: "Couldn't connect to D&D Beyond. Check your internet connection." },
      { status: 502 }
    );
  }

  if (upstream.status === 403 || upstream.status === 404) {
    return NextResponse.json(
      {
        error:
          "Character isn't public or doesn't exist. Open it on D&D Beyond → Manage → Privacy & Sharing → Public, then try again.",
      },
      { status: upstream.status }
    );
  }

  if (!upstream.ok) {
    return NextResponse.json(
      { error: `D&D Beyond is temporarily unavailable (error ${upstream.status}). Try again later.` },
      { status: upstream.status }
    );
  }

  const json = await upstream.json();
  if (!json?.success || !json?.data) {
    return NextResponse.json(
      { error: "Character isn't public or doesn't exist. Check the privacy settings on D&D Beyond." },
      { status: 404 }
    );
  }

  return NextResponse.json(json);
}
