const fs = require("fs");
const readline = require("readline");

// CONFIGURATION
const INPUT_FILE = "verified_services.sql";
const CLEANED_FILE = "clean_verified_services_batch.sql";
const UNNAMED_FILE = "sin_nombre.sql";

const TARGET_STRINGS = ["(sin nombre)", "(unnamed)"];
const NOMINATIM_COMMENT = "-- nombre resuelto via nominatim";

async function filterSqlFile() {
  console.log(`[+] Starting advanced file filtering process...`);

  if (!fs.existsSync(INPUT_FILE)) {
    console.error(
      `[X] Error: The file "${INPUT_FILE}" does not exist in this directory.`,
    );
    return;
  }

  const fileStream = fs.createReadStream(INPUT_FILE);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity,
  });

  const cleanedWriteStream = fs.createWriteStream(CLEANED_FILE);
  const unnamedWriteStream = fs.createWriteStream(UNNAMED_FILE);

  let keptRows = 0;
  let removedRows = 0;
  let moveNextLine = false; // Bandera de estado para capturar la fila de abajo

  for await (const line of rl) {
    const lineLower = line.toLowerCase();

    // 1. Si la línea anterior fue un comentario de Nominatim, capturamos esta fila (el INSERT)
    if (moveNextLine) {
      unnamedWriteStream.write(line + "\n");
      removedRows++;
      moveNextLine = false; // Resetear la bandera
      continue;
    }

    // 2. Detectar el comentario específico de Nominatim
    if (lineLower.includes(NOMINATIM_COMMENT)) {
      unnamedWriteStream.write(line + "\n");
      removedRows++;
      moveNextLine = true; // Activar para capturar el INSERT en la próxima iteración
      continue;
    }

    // 3. Ignorar/Copiar comentarios genéricos de estructura o líneas vacías
    if (line.trim().startsWith("--") || line.trim() === "") {
      cleanedWriteStream.write(line + "\n");
      unnamedWriteStream.write(line + "\n");
      continue;
    }

    // 4. Comprobar si la fila normal contiene "(sin nombre)" o "(unnamed)"
    const hasTargetString = TARGET_STRINGS.some((term) =>
      lineLower.includes(term),
    );

    if (hasTargetString) {
      unnamedWriteStream.write(line + "\n");
      removedRows++;
    } else {
      cleanedWriteStream.write(line + "\n");
      keptRows++;
    }
  }

  cleanedWriteStream.end();
  unnamedWriteStream.end();

  console.log(`\n[🏁] Advanced filtering complete!`);
  console.log(
    `[📊] Valid records kept (saved in ${CLEANED_FILE}): ${keptRows}`,
  );
  console.log(
    `[💾] Lines isolated/removed (saved in ${UNNAMED_FILE}): ${removedRows}`,
  );
}

filterSqlFile().catch((err) => console.error("[X] Unexpected error:", err));
