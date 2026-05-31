import { NextRequest, NextResponse } from "next/server";
import { generateShirtDesign } from "@/lib/design";
import { normalizeVenmo } from "@/lib/venmo";

export async function GET(request: NextRequest) {
  const venmo = request.nextUrl.searchParams.get("venmo");
  if (!venmo) {
    return NextResponse.json({ error: "venmo is required" }, { status: 400 });
  }

  try {
    const normalized = normalizeVenmo(venmo);
    const png = await generateShirtDesign(normalized);
    return new NextResponse(new Uint8Array(png), {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "private, max-age=60",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid venmo";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
