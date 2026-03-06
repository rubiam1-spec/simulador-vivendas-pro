export type Lote = {
  quadra: string;
  lote: string;
  valor: number;
  status?: string;
};

const CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vQi-gTfBpXUA6ReVP6V2Lfy9t_97vJGPWWJUkqImxb6YMlodJktbdOHhQgXh6MAKrzoyEnjpc9bFFFH/pub?gid=0&single=true&output=csv";

/** Detecta delimitador: algumas publicações vêm com ; ao invés de , */
function detectDelimiter(sampleLine: string): "," | ";" {
  const commas = (sampleLine.match(/,/g) || []).length;
  const semis = (sampleLine.match(/;/g) || []).length;
  return semis > commas ? ";" : ",";
}

// Parser simples de CSV com aspas (evita quebrar quando tiver vírgula dentro de texto)
function parseCSVLine(line: string, delimiter: "," | ";" = ","): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];

    if (ch === '"') {
      // aspas dupla escapada ""
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (ch === delimiter && !inQuotes) {
      out.push(cur);
      cur = "";
      continue;
    }

    cur += ch;
  }

  out.push(cur);
  return out.map((s) => s.trim());
}

function normalizeHeader(s: string) {
  return (s || "")
    .trim()
    .toLowerCase()
    .replace(/^\uFEFF/, "") // remove BOM
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, ""); // remove acentos
}

function cleanTextCell(v: string) {
  // remove aspas, apóstrofo de planilha e espaços
  return (v || "")
    .trim()
    .replace(/^'+/, "") // remove ' no início
    .replace(/^"+|"+$/g, "");
}

function cleanIdCell(v: string) {
  // para quadra/lote: remove * (muito comum na planilha), aspas e espaços extras
  return cleanTextCell(v)
    .replace(/\*/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function toNumberBR(value: string): number {
  const v = (value || "").trim();
  if (!v) return 0;

  // remove R$, espaços e separador de milhar
  const clean = v
    .replace(/r\$/gi, "")
    .replace(/\s/g, "")
    .replace(/\./g, "")
    .replace(/,/g, "."); // decimal BR -> ponto

  const n = Number(clean);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Escolhe índice do "valor" de forma mais precisa.
 * Preferência:
 * 1) header === "valor"
 * 2) header contém "valor" mas não contém "entrada"/"parcel"/"balao"/"balão"
 * 3) fallback "preco"/"preço"
 */
function pickValorIndex(headerNorm: string[]): number {
  const exactValor = headerNorm.findIndex((c) => c === "valor");
  if (exactValor !== -1) return exactValor;

  const valorLike = headerNorm.findIndex((c) => {
    if (!c.includes("valor")) return false;
    const bad =
      c.includes("entrada") ||
      c.includes("parcela") ||
      c.includes("parcelas") ||
      c.includes("balao") ||
      c.includes("baloes") ||
      c.includes("balão") ||
      c.includes("balões");
    return !bad;
  });
  if (valorLike !== -1) return valorLike;

  const preco = headerNorm.findIndex((c) => c.includes("preco") || c.includes("preço"));
  return preco;
}

function findHeaderIndexes(headerRaw: string[]) {
  const header = headerRaw.map(normalizeHeader);

  const idxQuadra = header.findIndex((c) => c === "quadra" || c.includes("quadra"));
  const idxLote = header.findIndex((c) => c === "lote" || c.includes("lote"));
  const idxValor = pickValorIndex(header);
  const idxStatus = header.findIndex((c) => c === "status" || c.includes("status"));

  const ok = idxQuadra !== -1 && idxLote !== -1 && idxValor !== -1;

  return {
    ok,
    header,
    idxQuadra,
    idxLote,
    idxValor,
    idxStatus,
  };
}

export async function carregarLotes(): Promise<Lote[]> {
  if (!CSV_URL || !CSV_URL.includes("output=csv")) {
    throw new Error('CSV_URL inválida. Garanta que termina com "output=csv".');
  }

  const response = await fetch(CSV_URL, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Falha ao buscar CSV: HTTP ${response.status}`);
  }

  const texto = await response.text();

  const linhas = texto
    .split(/\r?\n/)
    .map((l) => l.replace(/^\uFEFF/, "")) // BOM no começo da linha
    .filter((l) => l.trim().length > 0);

  if (linhas.length < 2) return [];

  const delimiter = detectDelimiter(linhas[0]);

  // procurar o cabeçalho correto nas primeiras N linhas
  const SEARCH_LIMIT = Math.min(40, linhas.length);
  let headerLineIndex = -1;
  let idxQuadra = -1;
  let idxLote = -1;
  let idxValor = -1;
  let idxStatus = -1;
  let headerNormalized: string[] = [];

  for (let i = 0; i < SEARCH_LIMIT; i++) {
    const raw = parseCSVLine(linhas[i], delimiter);
    const found = findHeaderIndexes(raw);

    if (found.ok) {
      headerLineIndex = i;
      idxQuadra = found.idxQuadra;
      idxLote = found.idxLote;
      idxValor = found.idxValor;
      idxStatus = found.idxStatus;
      headerNormalized = found.header;
      break;
    }
  }

  if (headerLineIndex === -1) {
    const preview = linhas
      .slice(0, SEARCH_LIMIT)
      .map((l) => parseCSVLine(l, delimiter).map(normalizeHeader).join(" | "))
      .join("\n");

    throw new Error(
      `Cabeçalho inválido. Não encontrei uma linha com colunas "quadra", "lote" e "valor" nas primeiras ${SEARCH_LIMIT} linhas.\n\nPreview:\n${preview}`
    );
  }

  console.log(
    "[planilhaService] Delimitador:",
    delimiter,
    "| Header encontrado na linha:",
    headerLineIndex + 1,
    headerNormalized
  );

  const lotes: Lote[] = [];

  for (let i = headerLineIndex + 1; i < linhas.length; i++) {
    const cols = parseCSVLine(linhas[i], delimiter);

    // se a linha veio menor do que deveria, ignora (evita acessar idx fora)
    const maxIdx = Math.max(idxQuadra, idxLote, idxValor, idxStatus);
    if (cols.length <= maxIdx) continue;

    const quadra = cleanIdCell(cols[idxQuadra] || "");
    const lote = cleanIdCell(cols[idxLote] || "");
    const valor = toNumberBR(cols[idxValor] || "");
    const status = idxStatus !== -1 ? cleanTextCell(cols[idxStatus] || "") : "";

    if (!quadra || !lote) continue;

    lotes.push({
      quadra,
      lote,
      valor,
      status: status || undefined,
    });
  }

  // sanity check: se quase todo mundo tiver o mesmo valor, é suspeito (coluna errada ou planilha errada)
  if (lotes.length >= 20) {
    const vals = lotes.map((x) => x.valor).filter((n) => Number.isFinite(n));
    const freq = new Map<number, number>();
    for (const v of vals) freq.set(v, (freq.get(v) || 0) + 1);

    let top = 0;
    let topVal: number | null = null;
    for (const [v, c] of freq.entries()) {
      if (c > top) {
        top = c;
        topVal = v;
      }
    }

    const ratio = top / (vals.length || 1);
    if (topVal !== null && ratio >= 0.9) {
      console.warn(
        `[planilhaService] ALERTA: ${Math.round(ratio * 100)}% dos lotes com o mesmo valor (${topVal}). Verifique se a coluna "Valor" do CSV está correta.`
      );
    }
  }

  return lotes;
}