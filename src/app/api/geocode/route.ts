import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { address, city } = await req.json();

  if (!address || !city) {
    return NextResponse.json(
      { error: "address and city are required" },
      { status: 400 },
    );
  }

  try {
    const query = encodeURIComponent(`${address}, ${city}, Venezuela`);
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${query}&format=json&limit=1`,
      { headers: { "User-Agent": "servicios-ve/1.0" } },
    );
    const data = await res.json();

    if (data.length === 0) {
      return NextResponse.json({ found: false });
    }

    return NextResponse.json({
      found: true,
      lat: parseFloat(data[0].lat),
      lng: parseFloat(data[0].lon),
      display_name: data[0].display_name,
    });
  } catch {
    return NextResponse.json({ error: "Geocoding failed" }, { status: 500 });
  }
}
