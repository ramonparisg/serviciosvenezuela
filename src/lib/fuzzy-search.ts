// Normaliza texto: quita acentos, minúsculas, caracteres especiales
export function normalize(str: string): string {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // quitar acentos
    .replace(/[^a-z0-9\s]/g, "") // quitar caracteres especiales
    .replace(/\s+/g, " ")
    .trim();
}

// Distancia de Levenshtein — mide cuántos cambios hay entre dos strings
function levenshtein(a: string, b: string): number {
  const m = a.length,
    n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)),
  );
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

export interface FuzzyResult<T> {
  item: T;
  score: number; // 0-1, mayor es mejor
}

export function fuzzySearch<T>(
  items: T[],
  query: string,
  getText: (item: T) => string,
  limit = 8,
): FuzzyResult<T>[] {
  const q = normalize(query);
  if (!q) return [];

  return items
    .map((item) => {
      const text = normalize(getText(item));
      const words = text.split(" ");

      // Match exacto o contiene → score alto
      if (text === q) return { item, score: 1.0 };
      if (text.startsWith(q)) return { item, score: 0.95 };
      if (text.includes(q)) return { item, score: 0.85 };

      // Alguna palabra empieza con el query
      if (words.some((w) => w.startsWith(q))) return { item, score: 0.75 };

      // Levenshtein por palabra — tolerancia a errores ortográficos
      const bestWordDist = Math.min(...words.map((w) => levenshtein(q, w)));
      const maxLen = Math.max(q.length, ...words.map((w) => w.length));
      const wordScore = 1 - bestWordDist / maxLen;

      // Levenshtein del texto completo
      const fullDist = levenshtein(q, text.slice(0, q.length + 3));
      const fullScore = 1 - fullDist / Math.max(q.length, text.length);

      const score = Math.max(wordScore, fullScore);

      return { item, score };
    })
    .filter((r) => r.score >= 0.4) // umbral mínimo de relevancia
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
