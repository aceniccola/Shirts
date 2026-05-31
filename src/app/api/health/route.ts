import { NextResponse } from "next/server";
import { isConfigured } from "@/lib/env";

export async function GET() {
  return NextResponse.json({
    ok: true,
    configured: isConfigured(),
  });
}
