const fs = require("fs");
const axios = require("axios");

const VENEZUELA_CAPITALS = [
  { city: "Puerto Ayacucho", state: "Amazonas", lat: 5.6639, lng: -67.6231 },
  { city: "Barcelona", state: "Anzoátegui", lat: 10.1333, lng: -64.7 },
  { city: "San Fernando de Apure", state: "Apure", lat: 7.8878, lng: -67.4724 },
  { city: "Maracay", state: "Aragua", lat: 10.25, lng: -67.6 },
  { city: "Barinas", state: "Barinas", lat: 8.6226, lng: -70.2075 },
  { city: "Ciudad Bolívar", state: "Bolívar", lat: 8.1167, lng: -63.55 },
  { city: "Valencia", state: "Carabobo", lat: 10.1667, lng: -68.0 },
  { city: "San Carlos", state: "Cojedes", lat: 9.6612, lng: -68.5827 },
  { city: "Tucupita", state: "Delta Amacuro", lat: 9.0601, lng: -62.051 },
  { city: "Caracas", state: "Distrito Capital", lat: 10.5, lng: -66.9167 },
  { city: "Coro", state: "Falcón", lat: 11.4045, lng: -69.6734 },
  {
    city: "San Juan de los Morros",
    state: "Guárico",
    lat: 9.9115,
    lng: -67.3537,
  },
  { city: "Barquisimeto", state: "Lara", lat: 10.0667, lng: -69.3333 },
  { city: "Mérida", state: "Mérida", lat: 8.6, lng: -71.15 },
  { city: "Los Teques", state: "Miranda", lat: 10.3441, lng: -67.0433 },
  { city: "Maturín", state: "Monagas", lat: 9.75, lng: -63.1833 },
  { city: "La Asunción", state: "Nueva Esparta", lat: 11.0333, lng: -63.8628 },
  { city: "Guanare", state: "Portuguesa", lat: 9.0418, lng: -69.7421 },
  { city: "Cumaná", state: "Sucre", lat: 10.4536, lng: -64.1826 },
  { city: "San Cristóbal", state: "Táchira", lat: 7.7667, lng: -72.2333 },
  { city: "Trujillo", state: "Trujillo", lat: 9.3701, lng: -70.4347 },
  { city: "La Guaira", state: "Vargas", lat: 10.6012, lng: -66.9311 },
  { city: "San Felipe", state: "Yaracuy", lat: 10.3399, lng: -68.7424 },
  { city: "Maracaibo", state: "Zulia", lat: 10.6667, lng: -71.6667 },
];

// Radio extendido para ciudades grandes
const LARGE_CITIES = [
  "Caracas",
  "Maracaibo",
  "Valencia",
  "Barquisimeto",
  "Maracay",
];
const DEFAULT_RADIUS = 10000;
const LARGE_CITY_RADIUS = 20000;

const OSM_QUERIES = [
  { type: "amenity", value: "hospital", label: "hospital" },
  { type: "amenity", value: "clinic", label: "hospital" },
  { type: "amenity", value: "pharmacy", label: "pharmacy" },
  { type: "amenity", value: "fuel", label: "gas" },
  { type: "shop", value: "supermarket", label: "supermarket" },
  { type: "shop", value: "convenience", label: "abasto" }, // mismo label por ahora
  { type: "shop", value: "grocery", label: "abasto" },
];

const OUTPUT_FILE = "insert_services_batch.sql";
const FAILED_LOG = "failed_requests.log";
const OVERPASS_URL = "https://overpass-api.de/api/interpreter";

const MAX_RETRIES = 4;
const BASE_DELAY_MS = 5000;

// ─── Circuit breaker ───────────────────────────────────────────────────────
// Estados: CLOSED (normal) → OPEN (bloqueado) → HALF_OPEN (probando)
const circuitBreaker = {
  state: "CLOSED", // CLOSED | OPEN | HALF_OPEN
  failures: 0,
  threshold: 3, // fallas consecutivas para abrir
  cooldownMs: 60000, // 1 minuto bloqueado antes de probar de nuevo
  lastFailureTime: null,

  recordSuccess() {
    this.failures = 0;
    if (this.state !== "CLOSED") {
      console.log(
        "   [✓] Circuit breaker: CLOSED — servidor respondiendo bien.",
      );
      this.state = "CLOSED";
    }
  },

  recordFailure() {
    this.failures++;
    this.lastFailureTime = Date.now();
    if (this.failures >= this.threshold) {
      if (this.state !== "OPEN") {
        console.warn(
          `   [⚡] Circuit breaker: OPEN — ${this.failures} fallas consecutivas. Esperando ${this.cooldownMs / 1000}s.`,
        );
        this.state = "OPEN";
      }
    }
  },

  async waitIfNeeded() {
    if (this.state === "CLOSED") return;

    if (this.state === "OPEN") {
      const elapsed = Date.now() - this.lastFailureTime;
      const remaining = this.cooldownMs - elapsed;
      if (remaining > 0) {
        console.log(
          `   [⏳] Circuit breaker OPEN. Esperando ${Math.ceil(remaining / 1000)}s...`,
        );
        await sleep(remaining);
      }
      this.state = "HALF_OPEN";
      console.log(
        "   [~] Circuit breaker: HALF_OPEN — probando si el servidor responde.",
      );
    }
    // HALF_OPEN: dejamos pasar el request y vemos si falla o no
  },

  isOpen() {
    return this.state === "OPEN";
  },
};

// ─── Utilidades ───────────────────────────────────────────────────────────
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const escapeSQL = (str) => {
  if (!str) return null;
  return str.replace(/'/g, "''").trim();
};

function logFailure(city, state, category, reason) {
  const line = `${new Date().toISOString()} | ${city}, ${state} | ${category} | ${reason}\n`;
  fs.appendFileSync(FAILED_LOG, line);
}

// ─── Fetch con reintentos y circuit breaker ───────────────────────────────
async function fetchWithRetry(target, category) {
  const radius = LARGE_CITIES.includes(target.city)
    ? LARGE_CITY_RADIUS
    : DEFAULT_RADIUS;

  const query = `
    [out:json][timeout:120];
    (
      node["${category.type}"="${category.value}"](around:${radius},${target.lat},${target.lng});
      way["${category.type}"="${category.value}"](around:${radius},${target.lat},${target.lng});
    );
    out center;
  `;

  const params = new URLSearchParams();
  params.append("data", query);

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    // Esperar si el circuit breaker está abierto
    await circuitBreaker.waitIfNeeded();

    try {
      console.log(
        `   [-] ${category.label} — intento ${attempt}/${MAX_RETRIES}...`,
      );

      const response = await axios.post(OVERPASS_URL, params, {
        timeout: 130000,
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "User-Agent":
            "VenezuelaEmergencySupplyMap/1.0 (CivicOrganizedCrisisReliefPlatform)",
        },
      });

      circuitBreaker.recordSuccess();
      const elements = response.data?.elements || [];
      console.log(
        `   [✓] ${category.label} — ${elements.length} elementos encontrados.`,
      );
      return elements;
    } catch (error) {
      const isTimeout =
        error.code === "ECONNABORTED" || error.response?.status === 504;
      const isOverloaded =
        error.response?.status === 429 || error.response?.status === 503;

      circuitBreaker.recordFailure();

      if (attempt === MAX_RETRIES) {
        console.error(
          `   [✗] ${category.label} — falló tras ${MAX_RETRIES} intentos. Guardando en log.`,
        );
        logFailure(target.city, target.state, category.label, error.message);
        return [];
      }

      // Backoff exponencial: 5s, 10s, 20s, 40s...
      const delay = BASE_DELAY_MS * Math.pow(2, attempt - 1);

      if (isOverloaded) {
        // Servidor sobrecargado — esperar más
        console.warn(
          `   [!] Servidor sobrecargado (${error.response?.status}). Esperando ${(delay * 2) / 1000}s...`,
        );
        await sleep(delay * 2);
      } else if (isTimeout) {
        console.warn(`   [!] Timeout. Reintentando en ${delay / 1000}s...`);
        await sleep(delay);
      } else {
        console.error(
          `   [!] Error inesperado: ${error.message}. Reintentando en ${delay / 1000}s...`,
        );
        await sleep(delay);
      }
    }
  }

  return [];
}

// ─── Procesar un elemento OSM → SQL ──────────────────────────────────────
function elementToSQL(el, category, target) {
  const tags = el.tags || {};
  const lat = el.lat ?? el.center?.lat;
  const lng = el.lon ?? el.center?.lon;

  if (!lat || !lng) return null;

  // Intentar construir dirección desde los tags disponibles
  const street = tags["addr:street"] ?? null;
  const number = tags["addr:housenumber"] ?? null;
  const suburb = tags["addr:suburb"] ?? tags["addr:neighbourhood"] ?? null;
  const address = street
    ? `${street}${number ? " " + number : ""}${suburb ? ", " + suburb : ""}`
    : (suburb ?? null);

  const name = escapeSQL(tags.name || `${category.label} (sin nombre)`);
  const addr = escapeSQL(address);
  const phone = escapeSQL(tags.phone || tags["contact:phone"] || null);
  const notes = escapeSQL(tags.operator ? `Operador: ${tags.operator}` : null);

  const addrVal = addr ? `'${addr}'` : "NULL";
  const phoneVal = phone ? `'${phone}'` : "NULL";
  const notesVal = notes ? `'${notes}'` : "NULL";

  return `INSERT INTO services (name, category, address, city, state, phone, notes, lat, lng) VALUES ('${name}', '${category.label}', ${addrVal}, '${escapeSQL(target.city)}', '${escapeSQL(target.state)}', ${phoneVal}, ${notesVal}, ${lat.toFixed(6)}, ${lng.toFixed(6)}) ON CONFLICT (lat, lng) DO NOTHING;`;
}

// ─── Main ────────────────────────────────────────────────────────────────
async function startExtraction() {
  // Limpiar logs anteriores
  fs.writeFileSync(
    OUTPUT_FILE,
    `-- Venezuelan Services Batch Import\n-- Generated: ${new Date().toISOString()}\n-- Run this AFTER creating the unique index:\n-- CREATE UNIQUE INDEX services_unique_lat_lng ON services (lat, lng);\n\n`,
  );
  fs.writeFileSync(FAILED_LOG, `-- Failed requests log\n`);

  let totalRecords = 0;
  let totalFailed = 0;

  for (const target of VENEZUELA_CAPITALS) {
    console.log(`\n${"=".repeat(52)}`);
    console.log(`[+] ${target.city}, ${target.state}`);
    console.log(`${"=".repeat(52)}`);

    let sqlChunk = `\n-- ${target.city}, ${target.state}\n`;
    let cityCount = 0;

    for (const category of OSM_QUERIES) {
      const elements = await fetchWithRetry(target, category);

      elements.forEach((el) => {
        const sql = elementToSQL(el, category, target);
        if (sql) {
          sqlChunk += sql + "\n";
          cityCount++;
          totalRecords++;
        }
      });

      if (elements.length === 0) totalFailed++;

      // Delay entre categorías — más corto si el servidor responde bien
      const delay = circuitBreaker.state === "CLOSED" ? 3000 : 8000;
      await sleep(delay);
    }

    fs.appendFileSync(OUTPUT_FILE, sqlChunk);
    console.log(`[✓] ${target.city}: ${cityCount} registros escritos.`);

    // Delay entre ciudades
    await sleep(6000);
  }

  console.log(`\n${"=".repeat(52)}`);
  console.log(`[🏁] Extracción completa`);
  console.log(`[📊] Registros totales: ${totalRecords}`);
  console.log(`[⚠️ ] Categorías sin datos: ${totalFailed}`);
  console.log(`[💾] SQL: ${OUTPUT_FILE}`);
  console.log(`[📋] Log de fallas: ${FAILED_LOG}`);

  if (totalFailed > 0) {
    console.log(
      `\n[!] Revisa ${FAILED_LOG} para ver qué ciudades/categorías fallaron y re-ejecuta solo esas.`,
    );
  }
}

startExtraction();
