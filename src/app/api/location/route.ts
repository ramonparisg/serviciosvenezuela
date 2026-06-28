import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const country = req.headers.get("CF-IPCountry") ?? "unknown";
  return NextResponse.json({ country });
}
