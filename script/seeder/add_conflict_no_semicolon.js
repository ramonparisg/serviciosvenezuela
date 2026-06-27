const fs = require("fs");
const readline = require("readline");

// CONFIGURACIÓN
const INPUT_FILE = "clean_verified_services_batch.sql"; // Tu archivo sin puntos y coma
const OUTPUT_FILE = "final_upsert_batch.sql"; // El archivo corregido final

async function addConflictClause() {
  console.log(
    `[+] Iniciando inyección de cláusula (Asumiendo que no existen puntos y coma)...`,
  );

  if (!fs.existsSync(INPUT_FILE)) {
    console.error(`[X] Error: El archivo "${INPUT_FILE}" no existe.`);
    return;
  }

  const fileStream = fs.createReadStream(INPUT_FILE);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity,
  });

  const writeStream = fs.createWriteStream(OUTPUT_FILE);
  let modifiedRows = 0;

  for await (const line of rl) {
    let cleanedLine = line.trim();

    // Procesar únicamente líneas que comiencen con INSERT
    if (cleanedLine.toUpperCase().startsWith("INSERT")) {
      // Limpieza preventiva: Si por algún motivo quedó un fragmento de un ON CONFLICT anterior, lo borramos
      const conflictIndex = cleanedLine.toUpperCase().indexOf("ON CONFLICT");
      if (conflictIndex !== -1) {
        cleanedLine = cleanedLine.substring(0, conflictIndex).trim();
      }

      // Concatenamos la instrucción y añadimos el punto y coma final de cierre
      const newLine = `${cleanedLine} ON CONFLICT (lat, lng) DO NOTHING;`;

      writeStream.write(newLine + "\n");
      modifiedRows++;
    } else {
      // Mantiene intactos los comentarios y saltos de línea de la estructura
      writeStream.write(line + "\n");
    }
  }

  writeStream.end();

  console.log(`\n[🏁] ¡Estructura recuperada con éxito!`);
  console.log(`[📊] Sentencias INSERT formateadas: ${modifiedRows}`);
  console.log(`[💾] Archivo listo para importar: ${OUTPUT_FILE}`);
}

addConflictClause().catch((err) => console.error("[X] Error inesperado:", err));
