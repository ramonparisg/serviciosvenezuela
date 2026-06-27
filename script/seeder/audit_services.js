const axios = require("axios");
const fs = require("fs");

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
const SQL_FILE = "insert_services_batch.sql";
const OUTPUT_VERIFIED = "verified_services.sql";
const OUTPUT_SUSPICIOUS = "suspicious_services.sql";
const OUTPUT_LOCATION_ONLY = "location_only_services.sql"; // ← nuevo
const OUTPUT_REPORT = "audit_report.json";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ─── Parsear SQL ──────────────────────────────────────────────────────────
function parseSQLFile(filePath) {
  const content = fs.readFileSync(filePath, "utf8");
  const records = [];

  const regex =
    /INSERT INTO services \(name, category, address, city, state, phone, notes, lat, lng\) VALUES \('([^']*)', '([^']*)', ([^,]*), '([^']*)', '([^']*)', ([^,]*), ([^,]*), ([\d.-]+), ([\d.-]+)\)/g;

  let match;
  while ((match = regex.exec(content)) !== null) {
    records.push({
      name: match[1],
      category: match[2],
      address: match[3].replace(/^'|'$/g, "").replace("NULL", ""),
      city: match[4],
      state: match[5],
      phone: match[6].replace(/^'|'$/g, "").replace("NULL", ""),
      notes: match[7].replace(/^'|'$/g, "").replace("NULL", ""),
      lat: parseFloat(match[8]),
      lng: parseFloat(match[9]),
      original: match[0],
    });
  }

  return records;
}

// ─── Normalización y similaridad ─────────────────────────────────────────
function normalizeName(name) {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function nameSimilarity(a, b) {
  const na = normalizeName(a);
  const nb = normalizeName(b);

  if (na === nb) return 1.0;
  if (na.includes(nb) || nb.includes(na)) return 0.85;

  const wordsA = new Set(na.split(" ").filter((w) => w.length > 2));
  const wordsB = new Set(nb.split(" ").filter((w) => w.length > 2));
  const intersection = [...wordsA].filter((w) => wordsB.has(w)).length;
  const union = new Set([...wordsA, ...wordsB]).size;

  return union === 0 ? 0 : intersection / union;
}

function isUnnamed(name) {
  return (
    !name ||
    /^(sin nombre|unnamed|n\/a|null)$/i.test(name.trim()) ||
    name.toLowerCase().includes("sin nombre") ||
    name.toLowerCase().includes("unnamed")
  );
}

// ─── Buscar nombre en Nominatim ───────────────────────────────────────────
async function getNameFromNominatim(lat, lng) {
  try {
    await sleep(1000); // Nominatim requiere máx 1 req/seg
    const res = await axios.get("https://nominatim.openstreetmap.org/reverse", {
      params: { lat, lon: lng, format: "json", namedetails: 1 },
      headers: { "User-Agent": "servicios-ve/1.0" },
      timeout: 10000,
    });

    const data = res.data;

    // Intentar obtener nombre en este orden de prioridad
    const name =
      data?.namedetails?.name ||
      data?.namedetails?.["name:es"] ||
      data?.name ||
      data?.display_name?.split(",")[0] ||
      null;

    // Si el nombre que devuelve es una calle o barrio, no sirve
    const isStreetOrArea =
      data?.type &&
      ["residential", "road", "neighbourhood", "suburb", "city"].includes(
        data.type,
      );
    if (isStreetOrArea) return null;

    return name && name.length > 2 ? name : null;
  } catch {
    return null;
  }
}

// ─── Google Places ────────────────────────────────────────────────────────
async function findInGooglePlaces(record) {
  try {
    const categoryToGoogleType = {
      hospital: null,
      pharmacy: "pharmacy",
      gas: "gas_station",
      supermarket: "supermarket",
      abasto: null,
      water: null,
    };

    const googleTypes = {
      hospital: ["hospital", "health", "doctor"],
      pharmacy: ["pharmacy"],
      gas: ["gas_station"],
      supermarket: ["supermarket", "grocery_or_supermarket"],
      abasto: ["convenience_store", "grocery_or_supermarket", "food"],
      water: [],
    };

    const googleType = categoryToGoogleType[record.category];

    const params = {
      location: `${record.lat},${record.lng}`,
      radius: 200,
      key: GOOGLE_API_KEY,
    };

    if (googleType) params.type = googleType;

    const res = await axios.get(
      "https://maps.googleapis.com/maps/api/place/nearbysearch/json",
      { params, timeout: 10000 },
    );

    if (res.data.status === "OVER_QUERY_LIMIT")
      throw new Error("OVER_QUERY_LIMIT");
    if (res.data.status === "REQUEST_DENIED")
      throw new Error(`REQUEST_DENIED: ${res.data.error_message}`);

    const results = res.data.results || [];
    if (results.length === 0) return { found: false, similarity: 0 };

    // Filtrar resultados que coincidan con el tipo esperado
    const expectedTypes = googleTypes[record.category] ?? [];
    const typeFiltered =
      expectedTypes.length > 0
        ? results.filter((r) => r.types?.some((t) => expectedTypes.includes(t)))
        : results;

    const pool = typeFiltered.length > 0 ? typeFiltered : results;

    // Encontrar el más similar por nombre
    const ranked = pool
      .map((r) => ({
        result: r,
        similarity: nameSimilarity(record.name, r.name),
        distanceDeg: Math.sqrt(
          Math.pow(r.geometry.location.lat - record.lat, 2) +
            Math.pow(r.geometry.location.lng - record.lng, 2),
        ),
      }))
      .sort((a, b) => b.similarity - a.similarity);

    const best = ranked[0];

    // Verificar si está muy cerca (~50m) independientemente del nombre
    const veryClose = ranked.find((r) => r.distanceDeg < 0.0005);
    const isVeryClose = !!veryClose;

    return {
      found: best.similarity > 0 || isVeryClose,
      match: best.result.name,
      similarity: best.similarity,
      isVeryClose,
      veryCloseName: veryClose?.result.name ?? null,
    };
  } catch (error) {
    if (error.message === "OVER_QUERY_LIMIT") throw error;
    if (error.message.startsWith("REQUEST_DENIED")) throw error;
    return { found: false, similarity: 0, error: error.message };
  }
}

// ─── Ciudades a auditar ───────────────────────────────────────────────────
const AUDIT_CITIES = new Set([
  "Caracas",
  "Valencia",
  "Barquisimeto",
  "Maracaibo",
  // "Barcelona",
  "La Guaira",
  // "San Cristóbal",
  // "Mérida",
]);

// ─── Main ─────────────────────────────────────────────────────────────────
async function runAudit() {
  if (!GOOGLE_API_KEY) {
    console.error("Falta GOOGLE_API_KEY");
    process.exit(1);
  }

  console.log(`[+] Leyendo ${SQL_FILE}...`);
  const records = parseSQLFile(SQL_FILE);
  console.log(`[+] ${records.length} registros. Iniciando auditoría...\n`);

  fs.writeFileSync(OUTPUT_VERIFIED, "-- Registros verificados\n\n");
  fs.writeFileSync(
    OUTPUT_SUSPICIOUS,
    "-- Registros sospechosos — revisar manualmente\n\n",
  );
  fs.writeFileSync(
    OUTPUT_LOCATION_ONLY,
    "-- Ubicación coincide pero nombre no — revisar\n\n",
  );

  const report = {
    total: records.length,
    verified: 0,
    suspicious: 0,
    location_only: 0,
    skipped: 0,
    unnamed_resolved: 0,
    unnamed_discarded: 0,
    byCategory: {},
    byCity: {},
  };

  for (let i = 0; i < records.length; i++) {
    const record = records[i];
    const progress = `[${i + 1}/${records.length}]`;

    // Ciudades no auditadas → verificadas directamente
    if (!AUDIT_CITIES.has(record.city)) {
      fs.appendFileSync(OUTPUT_VERIFIED, record.original + "\n");
      report.skipped++;
      continue;
    }

    if (!report.byCategory[record.category])
      report.byCategory[record.category] = {
        verified: 0,
        suspicious: 0,
        location_only: 0,
      };
    if (!report.byCity[record.city])
      report.byCity[record.city] = {
        verified: 0,
        suspicious: 0,
        location_only: 0,
      };

    // Water no tiene equivalente en Google → verificar solo con Nominatim
    if (record.category === "water") {
      fs.appendFileSync(OUTPUT_VERIFIED, record.original + "\n");
      report.verified++;
      report.byCategory[record.category].verified++;
      report.byCity[record.city].verified++;
      continue;
    }

    try {
      // ── Caso: sin nombre en OSM ──────────────────────────────────────
      if (isUnnamed(record.name)) {
        console.log(
          `${progress} 🔍 Sin nombre — buscando en Nominatim... (${record.city})`,
        );
        const nominatimName = await getNameFromNominatim(
          record.lat,
          record.lng,
        );

        if (nominatimName) {
          // Encontró nombre en Nominatim — reemplazar y verificar
          const safeName = nominatimName.replace(/'/g, "''");
          const finalSQL = record.original.replace(
            /VALUES \('[^']*'/,
            `VALUES ('${safeName}'`,
          );
          fs.appendFileSync(
            OUTPUT_VERIFIED,
            `-- Nombre resuelto via Nominatim\n${finalSQL}\n`,
          );
          report.verified++;
          report.unnamed_resolved++;
          report.byCategory[record.category].verified++;
          report.byCity[record.city].verified++;
          console.log(
            `${progress} ✅ Sin nombre → "${nominatimName}" (Nominatim)`,
          );
        } else {
          // Nominatim tampoco lo encontró → descartar
          fs.appendFileSync(
            OUTPUT_SUSPICIOUS,
            `-- Sin nombre en OSM ni Nominatim\n-- ${record.category} | ${record.city} | ${record.lat}, ${record.lng}\n-- ${record.original}\n\n`,
          );
          report.suspicious++;
          report.unnamed_discarded++;
          report.byCategory[record.category].suspicious++;
          report.byCity[record.city].suspicious++;
          console.log(
            `${progress} ❌ Sin nombre y Nominatim no encontró nada — descartado`,
          );
        }

        await sleep(200);
        continue;
      }

      // ── Caso: con nombre en OSM → contrastar con Google ─────────────
      const result = await findInGooglePlaces(record);

      if (result.similarity >= 0.4) {
        // Nombre coincide bien → verificado
        fs.appendFileSync(OUTPUT_VERIFIED, record.original + "\n");
        report.verified++;
        report.byCategory[record.category].verified++;
        report.byCity[record.city].verified++;
        console.log(
          `${progress} ✅ ${record.name} (${record.city}) → "${result.match}" sim=${(result.similarity * 100).toFixed(0)}%`,
        );
      } else if (result.isVeryClose) {
        // Coordenadas coinciden pero similaridad no alcanza el umbral → location_only
        // Sin importar si es 0%, 15%, 30% — si no llega a 0.4 y está cerca va aquí
        const note = [
          `-- OSM:    "${record.name}"`,
          `-- Google: "${result.veryCloseName ?? result.match ?? "sin nombre"}" (sim=${(result.similarity * 100).toFixed(0)}%)`,
          `-- Ciudad: ${record.city} | Coords: ${record.lat}, ${record.lng}`,
        ].join("\n");
        fs.appendFileSync(
          OUTPUT_LOCATION_ONLY,
          note + "\n" + record.original + "\n\n",
        );
        report.location_only++;
        report.byCategory[record.category].location_only++;
        report.byCity[record.city].location_only++;
        console.log(
          `${progress} 📍 ${record.name} (${record.city}) → "${result.veryCloseName ?? result.match}" sim=${(result.similarity * 100).toFixed(0)}% → location_only`,
        );
      } else {
        // No está cerca ni coincide el nombre → sospechoso
        fs.appendFileSync(
          OUTPUT_SUSPICIOUS,
          `-- OSM: "${record.name}" | Google: "${result.match ?? "nada"}" sim=${(result.similarity * 100).toFixed(0)}% | ${record.city}\n${record.original}\n\n`,
        );
        report.suspicious++;
        report.byCategory[record.category].suspicious++;
        report.byCity[record.city].suspicious++;
        console.log(
          `${progress} ⚠️  ${record.name} (${record.city}) — no encontrado → sospechoso`,
        );
      }

      await sleep(200);
    } catch (error) {
      if (error.message === "OVER_QUERY_LIMIT") {
        console.warn("\n[!] Límite de Google. Esperando 60s...\n");
        await sleep(60000);
        i--;
        continue;
      }
      console.error(`${progress} ERROR: ${error.message}`);
    }
  }

  // Guardar reporte
  fs.writeFileSync(OUTPUT_REPORT, JSON.stringify(report, null, 2));

  console.log(`\n${"=".repeat(52)}`);
  console.log(`[🏁] Auditoría completa`);
  console.log(`[📊] Total:            ${report.total}`);
  console.log(`[✅] Verificados:      ${report.verified}`);
  console.log(
    `[📍] Solo ubicación:   ${report.location_only} → ${OUTPUT_LOCATION_ONLY}`,
  );
  console.log(
    `[⚠️ ] Sospechosos:     ${report.suspicious} → ${OUTPUT_SUSPICIOUS}`,
  );
  console.log(`[⏭️ ] Sin auditar:     ${report.skipped}`);
  console.log(
    `[🔤] Nombres resueltos via Nominatim: ${report.unnamed_resolved}`,
  );
  console.log(
    `[🗑️ ] Sin nombre descartados:         ${report.unnamed_discarded}`,
  );
  console.log(`\nCobertura por categoría:`);
  for (const [cat, counts] of Object.entries(report.byCategory)) {
    const total = counts.verified + counts.suspicious + counts.location_only;
    const pct = total > 0 ? Math.round((counts.verified / total) * 100) : 0;
    console.log(
      `  ${cat}: ${counts.verified}/${total} verificados (${pct}%) | ubicación: ${counts.location_only}`,
    );
  }
  console.log(`\n[💾] ${OUTPUT_VERIFIED}      → importar a Supabase`);
  console.log(`[💾] ${OUTPUT_LOCATION_ONLY} → revisar manualmente`);
  console.log(`[💾] ${OUTPUT_SUSPICIOUS}    → descartar o revisar`);
}

runAudit();
