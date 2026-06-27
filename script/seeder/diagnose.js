const axios = require("axios");
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;

async function diagnose() {
  const record = {
    name: "Clínica Integral de los Niños",
    category: "hospital",
    lat: 10.142795,
    lng: -64.676813,
  };

  console.log("=== TEST 1: Nearby sin type, radio 200m ===");
  const r1 = await axios.get(
    "https://maps.googleapis.com/maps/api/place/nearbysearch/json",
    {
      params: {
        location: `${record.lat},${record.lng}`,
        radius: 200,
        key: GOOGLE_API_KEY,
      },
    },
  );
  console.log(
    "Resultados:",
    r1.data.results.map(
      (r) =>
        `${r.name} | ${r.geometry.location.lat}, ${r.geometry.location.lng}`,
    ),
  );

  console.log("\n=== TEST 2: Nearby con type=hospital, radio 200m ===");
  const r2 = await axios.get(
    "https://maps.googleapis.com/maps/api/place/nearbysearch/json",
    {
      params: {
        location: `${record.lat},${record.lng}`,
        radius: 200,
        type: "hospital",
        key: GOOGLE_API_KEY,
      },
    },
  );
  console.log(
    "Resultados:",
    r2.data.results.map(
      (r) =>
        `${r.name} | ${r.geometry.location.lat}, ${r.geometry.location.lng}`,
    ),
  );

  console.log("\n=== TEST 3: Nearby sin type, radio 500m ===");
  const r3 = await axios.get(
    "https://maps.googleapis.com/maps/api/place/nearbysearch/json",
    {
      params: {
        location: `${record.lat},${record.lng}`,
        radius: 500,
        key: GOOGLE_API_KEY,
      },
    },
  );
  console.log(
    "Resultados:",
    r3.data.results.map(
      (r) =>
        `${r.name} | ${r.geometry.location.lat}, ${r.geometry.location.lng}`,
    ),
  );
}

diagnose();
