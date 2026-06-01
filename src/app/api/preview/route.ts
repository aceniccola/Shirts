import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { generateShirtDesignPreview, parseDesignText } from "@/lib/design";
import { normalizeVenmo } from "@/lib/venmo";

const previewBodySchema = z.object({
  venmo: z.string().min(1).max(32),
  designText: z.string().min(1).max(120),
});

async function renderPreview(venmo: string, designText: string) {
  const normalizedVenmo = normalizeVenmo(venmo);
  const lines = parseDesignText(designText);
  const png = await generateShirtDesignPreview(normalizedVenmo, lines);
  return new NextResponse(new Uint8Array(png), {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "private, max-age=30",
    },
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = previewBodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 },
      );
    }
    return renderPreview(parsed.data.venmo, parsed.data.designText);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid preview";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function GET(request: NextRequest) {
  const venmo = request.nextUrl.searchParams.get("venmo");
  const designText =
    request.nextUrl.searchParams.get("designText") ??
    request.nextUrl.searchParams.get("text");

  if (!venmo || !designText) {
    return NextResponse.json(
      { error: "venmo and designText are required" },
      { status: 400 },
    );
  }

  try {
    return renderPreview(venmo, designText);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid preview";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
