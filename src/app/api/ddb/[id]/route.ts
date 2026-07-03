import { NextResponse } from "next/server";

export async function GET(_req: Request, ctx: RouteContext<"/api/ddb/[id]">) {
  const { id } = await ctx.params;

  if (!/^\d+$/.test(id)) {
    return NextResponse.json({ error: "Невірний ID персонажа." }, { status: 400 });
  }

  let upstream: Response;
  try {
    upstream = await fetch(`https://character-service.dndbeyond.com/character/v5/character/${id}`, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; dm-dashboard)" },
      cache: "no-store",
    });
  } catch {
    return NextResponse.json(
      { error: "Не вдалося з'єднатися з D&D Beyond. Перевірте інтернет-з'єднання." },
      { status: 502 }
    );
  }

  if (upstream.status === 403 || upstream.status === 404) {
    return NextResponse.json(
      {
        error:
          "Персонаж не публічний або не існує. Відкрийте його на D&D Beyond → Manage → Privacy & Sharing → Public, і спробуйте ще раз.",
      },
      { status: upstream.status }
    );
  }

  if (!upstream.ok) {
    return NextResponse.json(
      { error: `D&D Beyond тимчасово недоступний (помилка ${upstream.status}). Спробуйте пізніше.` },
      { status: upstream.status }
    );
  }

  const json = await upstream.json();
  if (!json?.success || !json?.data) {
    return NextResponse.json(
      { error: "Персонаж не публічний або не існує. Перевірте налаштування приватності на D&D Beyond." },
      { status: 404 }
    );
  }

  return NextResponse.json(json);
}
