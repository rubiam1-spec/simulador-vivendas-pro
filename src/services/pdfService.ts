import jsPDF from "jspdf";

import logoBomm from "../assets/logo-bomm.png";
import logoVivendas from "../assets/logo-vivendas.png";
import { branding } from "../config/branding";

type UnidadePdf = {
  quadra: string;
  lote: string;
  valor: string;
};

type IdentificacaoPdf = {
  clienteNome: string;
  clienteCpf?: string;
  clienteTelefone?: string;
  clienteEmail?: string;
  clienteProfissao?: string;
  clienteEstadoCivil?: string;
  corretor: string;
  creci?: string;
  imobiliaria: string;
};

export type PdfPropostaPayload = IdentificacaoPdf & {
  data: string;
  clienteLogoDataUrl?: string;
  quadra: string;
  lote: string;
  valor: string;
  unidades: UnidadePdf[];
  entrada?: {
    valor: string;
    quantidadeParcelas: string;
    valorParcela: string;
    primeiroVencimento: string;
  };
  mensais?: {
    quantidadeParcelas: string;
    valorParcela: string;
    primeiroVencimento: string;
  };
  balao?: {
    tipo: string;
    quantidadeParcelas: string;
    valorParcela: string;
    primeiroVencimento: string;
  };
  permuta?: {
    valor: string;
    descricao: string;
  };
  observacao?: string;
  detalhesNegociacao?: string | string[];
};

export type PdfContrapropostaPayload = IdentificacaoPdf & {
  data: string;
  clienteLogoDataUrl?: string;
  quadra: string;
  lote: string;
  valor: string;
  unidades: UnidadePdf[];
  condicaoAprovada: {
    valor: string;
    entrada: string;
    mensaisQuantidade: string;
    mensaisValor: string;
    balaoTipo?: string;
    balaoQuantidade?: string;
    balaoValor?: string;
    validade?: string;
  };
  permuta?: {
    valor: string;
    descricao: string;
  };
  observacao?: string;
  detalhesNegociacao?: string | string[];
};

export type PdfSimulacaoPayload = IdentificacaoPdf & {
  data: string;
  quadra: string;
  lote: string;
  valor: string;
  unidades: UnidadePdf[];
  entrada: string;
  saldoFinal?: {
    valor: string;
    vencimento: string;
    forma: string;
  };
  permuta?: {
    valor: string;
    descricao: string;
  };
  veiculo?: {
    valor: string;
    descricao: string;
  };
  mensais: {
    quantidadeParcelas: string;
    valorParcela: string;
  };
  balao?: {
    tipo: string;
    quantidadeParcelas: string;
    valorParcela: string;
  };
  baseParcelasEBaloes: string;
  saldoRemanescente: string;
  detalhesNegociacao?: string | string[];
  observacao?: string;
};

type RGB = readonly [number, number, number];

type LayoutMeta = {
  titulo: string;
  subtitulo: string;
  data: string;
  clienteLogoDataUrl?: string;
};

type Field = {
  label: string;
  value: string;
};

type ResolvedLotData = {
  quadra: string;
  lote: string;
  valor: string;
};

type ResolvedTextBlocks = {
  detalhes?: string;
  observacao?: string;
};

const PAGE_WIDTH = 595;
const PAGE_HEIGHT = 842;
const HEADER_HEIGHT = 110;
const PAGE_START_Y = 148;
const PAGE_END_Y = 792;
const CONTENT_LEFT = 42;
const CONTENT_WIDTH = 511;
const FOOTER_Y = 812;
const SECTION_TITLE_HEIGHT = 24;
const SECTION_GAP = 18;
const FIELD_GAP = 12;
const FIELD_MIN_HEIGHT = 46;
const TEXT_PADDING_X = 12;
const TEXT_PADDING_TOP = 26;
const TEXT_LINE_HEIGHT = 14;
const TEXT_SECTION_MIN_HEIGHT = 60;
const SIGNATURE_HEIGHT = 118;

const COLORS = {
  greenDark: [27, 67, 50] as RGB,
  greenMid: [45, 106, 79] as RGB,
  greenAccent: [82, 183, 136] as RGB,
  grayDark: [31, 41, 55] as RGB,
  grayMid: [107, 114, 128] as RGB,
  grayBorder: [229, 231, 235] as RGB,
  cardBg: [249, 250, 251] as RGB,
  white: [255, 255, 255] as RGB,
};

function setColor(
  doc: jsPDF,
  type: "fill" | "draw" | "text",
  rgb: RGB
) {
  if (type === "fill") doc.setFillColor(rgb[0], rgb[1], rgb[2]);
  if (type === "draw") doc.setDrawColor(rgb[0], rgb[1], rgb[2]);
  if (type === "text") doc.setTextColor(rgb[0], rgb[1], rgb[2]);
}

function cleanString(value?: string) {
  return (value || "").trim();
}

function hasMeaningfulValue(value?: string) {
  const normalized = cleanString(value);
  return Boolean(normalized && normalized !== "-");
}

function safeText(value?: string) {
  return hasMeaningfulValue(value) ? cleanString(value) : "-";
}

function parseCurrencyValue(value?: string) {
  const normalized = cleanString(value)
    .replace(/\s/g, "")
    .replace(/[R$\u00A0]/g, "")
    .replace(/\./g, "")
    .replace(/,/g, ".");
  const number = Number(normalized);
  return Number.isFinite(number) ? number : 0;
}

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function normalizeList(value?: string) {
  return cleanString(value)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeLongText(value?: string | string[]) {
  const lines = Array.isArray(value)
    ? value.map((line) => line.replace(/\s+$/g, ""))
    : cleanString(value).split("\n");

  return lines
    .map((line) => line.trimEnd())
    .filter((line, index, all) => {
      if (!line.trim()) {
        return index > 0 && index < all.length - 1;
      }
      return true;
    })
    .join("\n")
    .trim();
}

function dedupeTextBlocks(
  detalhes?: string | string[],
  observacao?: string
): ResolvedTextBlocks {
  const observation = normalizeLongText(observacao);
  const detailLines = normalizeLongText(detalhes)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => {
      const normalizedLine = line
        .replace(/^observa[cç][aã]o:?/i, "")
        .trim()
        .toLowerCase();
      const normalizedObservation = observation.toLowerCase();
      return !normalizedObservation || normalizedLine !== normalizedObservation;
    });

  return {
    detalhes: detailLines.length ? detailLines.join("\n") : undefined,
    observacao: observation || undefined,
  };
}

function normalizeUnits(unidades: UnidadePdf[]) {
  return unidades
    .map((unidade) => ({
      quadra: safeText(unidade.quadra),
      lote: safeText(unidade.lote),
      valor: safeText(unidade.valor),
    }))
    .filter(
      (unidade) =>
        unidade.quadra !== "-" || unidade.lote !== "-" || unidade.valor !== "-"
    );
}

function consolidateUnits(unidades: UnidadePdf[]) {
  const normalizedUnits = normalizeUnits(unidades);

  if (!normalizedUnits.length) {
    return {
      quadra: "-",
      lote: "-",
      valor: "-",
    };
  }

  const quadras = Array.from(
    new Set(normalizedUnits.map((unidade) => unidade.quadra))
  );
  const lotes = normalizedUnits.map((unidade) => unidade.lote);
  const valorTotal = normalizedUnits.reduce(
    (sum, unidade) => sum + parseCurrencyValue(unidade.valor),
    0
  );

  return {
    quadra: quadras.join(", "),
    lote: lotes.join(", "),
    valor: valorTotal > 0 ? formatCurrency(valorTotal) : "-",
  };
}

function resolveLotData(payload: {
  quadra: string;
  lote: string;
  valor: string;
  unidades: UnidadePdf[];
}): ResolvedLotData {
  const consolidated = consolidateUnits(payload.unidades);
  const payloadQuadra = normalizeList(payload.quadra).join(", ");
  const payloadLote = normalizeList(payload.lote).join(", ");
  const payloadValor = parseCurrencyValue(payload.valor);
  const consolidatedValor = parseCurrencyValue(consolidated.valor);

  return {
    quadra:
      consolidated.quadra !== "-" &&
      (!hasMeaningfulValue(payload.quadra) || payloadQuadra !== consolidated.quadra)
        ? consolidated.quadra
        : safeText(payload.quadra),
    lote:
      consolidated.lote !== "-" &&
      (!hasMeaningfulValue(payload.lote) || payloadLote !== consolidated.lote)
        ? consolidated.lote
        : safeText(payload.lote),
    valor:
      consolidatedValor > 0 && (payloadValor <= 0 || safeText(payload.valor) !== consolidated.valor)
        ? consolidated.valor
        : payloadValor > 0
          ? safeText(payload.valor)
          : consolidated.valor,
  };
}

function addLogo(
  doc: jsPDF,
  imageData: string,
  format: "PNG" | "JPEG",
  x: number,
  y: number,
  maxWidth: number,
  maxHeight: number
) {
  const properties = doc.getImageProperties(imageData);
  const sourceWidth = properties.width || maxWidth;
  const sourceHeight = properties.height || maxHeight;
  const ratio = Math.min(maxWidth / sourceWidth, maxHeight / sourceHeight);
  const width = sourceWidth * ratio;
  const height = sourceHeight * ratio;
  const drawX = x + (maxWidth - width) / 2;
  const drawY = y + (maxHeight - height) / 2;

  doc.addImage(imageData, format, drawX, drawY, width, height);
}

function isCurrencyText(value: string) {
  return /^\s*R\$\s?[\d.\s,]+$/.test(value);
}

function drawMetricValue(
  doc: jsPDF,
  value: string,
  x: number,
  y: number,
  width: number
) {
  const innerWidth = width - 24;

  if (isCurrencyText(value)) {
    let fontSize = 14;
    doc.setFont("helvetica", "bold");
    while (fontSize > 10.5) {
      doc.setFontSize(fontSize);
      if (doc.getTextWidth(value) <= innerWidth) {
        break;
      }
      fontSize -= 0.5;
    }
    doc.text(value, x + 12, y + 34);
    return;
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  const valueLines = doc.splitTextToSize(value, innerWidth) as string[];
  doc.text(valueLines, x + 12, y + 34);
}

function renderPageFrame(doc: jsPDF, meta: LayoutMeta) {
  setColor(doc, "fill", COLORS.white);
  doc.rect(0, 0, PAGE_WIDTH, PAGE_HEIGHT, "F");

  setColor(doc, "fill", COLORS.greenDark);
  doc.rect(0, 0, PAGE_WIDTH, HEADER_HEIGHT, "F");

  try {
    addLogo(doc, logoVivendas, "PNG", CONTENT_LEFT, 18, 134, 44);
    if (meta.clienteLogoDataUrl) {
      addLogo(doc, meta.clienteLogoDataUrl, "PNG", PAGE_WIDTH - CONTENT_LEFT - 120, 18, 120, 44);
    } else {
      addLogo(doc, logoBomm, "PNG", PAGE_WIDTH - CONTENT_LEFT - 120, 18, 120, 44);
    }
  } catch {
    setColor(doc, "text", COLORS.white);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text("Vivendas do Bosque", CONTENT_LEFT, 40);
    doc.text("BOMM", PAGE_WIDTH - CONTENT_LEFT, 40, { align: "right" });
  }

  setColor(doc, "draw", COLORS.greenAccent);
  doc.setLineWidth(1.2);
  doc.line(CONTENT_LEFT, HEADER_HEIGHT - 18, PAGE_WIDTH - CONTENT_LEFT, HEADER_HEIGHT - 18);

  const titleAreaLeft = CONTENT_LEFT + 150;
  const titleAreaRight = PAGE_WIDTH - CONTENT_LEFT - 140;
  const titleAreaCenter = (titleAreaLeft + titleAreaRight) / 2;

  setColor(doc, "text", COLORS.white);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text(meta.titulo, titleAreaCenter, 60, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10.5);
  doc.text(meta.subtitulo, titleAreaCenter, 81, { align: "center" });

  setColor(doc, "text", COLORS.grayMid);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text("Empreendimento: Vivendas do Bosque", CONTENT_LEFT, 136);
  doc.text(`Data do documento: ${safeText(meta.data)}`, PAGE_WIDTH - CONTENT_LEFT, 136, {
    align: "right",
  });

  setColor(doc, "draw", COLORS.grayBorder);
  doc.setLineWidth(1);
  doc.line(CONTENT_LEFT, 146, PAGE_WIDTH - CONTENT_LEFT, 146);

  setColor(doc, "draw", COLORS.grayBorder);
  doc.line(CONTENT_LEFT, FOOTER_Y - 10, PAGE_WIDTH - CONTENT_LEFT, FOOTER_Y - 10);

  setColor(doc, "text", COLORS.grayMid);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.8);
  doc.text(
    "Parcelas corrigidas por INCC até a entrega e, após a entrega, por IPCA.",
    CONTENT_LEFT,
    FOOTER_Y
  );
  doc.text(branding.clientName, PAGE_WIDTH - CONTENT_LEFT, FOOTER_Y, {
    align: "right",
  });
}

function createDocument(meta: LayoutMeta) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  renderPageFrame(doc, meta);
  return doc;
}

function startNewPage(doc: jsPDF, meta: LayoutMeta) {
  doc.addPage();
  renderPageFrame(doc, meta);
  return PAGE_START_Y;
}

function ensureSpace(doc: jsPDF, y: number, requiredHeight: number, meta: LayoutMeta) {
  if (y + requiredHeight <= PAGE_END_Y) {
    return y;
  }

  return startNewPage(doc, meta);
}

function drawSectionTitle(doc: jsPDF, title: string, y: number) {
  setColor(doc, "fill", COLORS.cardBg);
  doc.roundedRect(CONTENT_LEFT, y, CONTENT_WIDTH, SECTION_TITLE_HEIGHT, 8, 8, "F");
  setColor(doc, "text", COLORS.greenDark);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text(title.toUpperCase(), CONTENT_LEFT + 14, y + 16);
}

function getFieldRowMetrics(doc: jsPDF, fields: Field[], widths: number[]) {
  const heights = fields.map((field, index) => {
    const lines = doc.splitTextToSize(field.value, widths[index] - TEXT_PADDING_X * 2) as string[];
    return Math.max(FIELD_MIN_HEIGHT, 30 + lines.length * 12);
  });
  return Math.max(...heights);
}

function drawFieldBox(
  doc: jsPDF,
  x: number,
  y: number,
  width: number,
  height: number,
  field: Field
) {
  setColor(doc, "draw", COLORS.grayBorder);
  setColor(doc, "fill", COLORS.cardBg);
  doc.roundedRect(x, y, width, height, 7, 7, "FD");

  setColor(doc, "text", COLORS.grayMid);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.text(field.label.toUpperCase(), x + TEXT_PADDING_X, y + 14);

  setColor(doc, "text", COLORS.grayDark);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  const lines = doc.splitTextToSize(field.value, width - TEXT_PADDING_X * 2) as string[];
  doc.text(lines, x + TEXT_PADDING_X, y + 30);
}

function drawFieldRow(
  doc: jsPDF,
  y: number,
  fields: Field[],
  meta: LayoutMeta,
  proportions?: number[]
) {
  const ratios = proportions || fields.map(() => 1);
  const totalRatio = ratios.reduce((sum, value) => sum + value, 0);
  const widths = ratios.map(
    (ratio, index) =>
      Number(
        (
          ((CONTENT_WIDTH - FIELD_GAP * (fields.length - 1)) * ratio) /
          totalRatio
        ).toFixed(index === ratios.length - 1 ? 0 : 2)
      )
  );
  const rowHeight = getFieldRowMetrics(doc, fields, widths);
  const startY = ensureSpace(doc, y, rowHeight, meta);

  let x = CONTENT_LEFT;
  fields.forEach((field, index) => {
    drawFieldBox(doc, x, startY, widths[index], rowHeight, field);
    x += widths[index] + FIELD_GAP;
  });

  return startY + rowHeight + SECTION_GAP;
}

function drawMetricCards(
  doc: jsPDF,
  y: number,
  title: string,
  items: Field[],
  meta: LayoutMeta
) {
  const startY = ensureSpace(doc, y, 110, meta);
  drawSectionTitle(doc, title, startY);

  const cards = items.slice(0, 4);
  const gap = 12;
  const width = (CONTENT_WIDTH - gap * (cards.length - 1)) / cards.length;
  const boxY = startY + 34;
  const height = 68;

  cards.forEach((item, index) => {
    const x = CONTENT_LEFT + index * (width + gap);
    setColor(doc, "draw", COLORS.grayBorder);
    setColor(doc, "fill", COLORS.white);
    doc.roundedRect(x, boxY, width, height, 8, 8, "FD");

    setColor(doc, "text", COLORS.grayMid);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.text(item.label.toUpperCase(), x + 12, boxY + 14);

    setColor(doc, "text", COLORS.greenDark);
    drawMetricValue(doc, item.value, x, boxY, width);
  });

  return boxY + height + SECTION_GAP;
}

function drawTextSection(
  doc: jsPDF,
  y: number,
  title: string,
  content: string | undefined,
  meta: LayoutMeta
) {
  const normalized = normalizeLongText(content);
  if (!normalized) return y;

  const lines = doc.splitTextToSize(normalized, CONTENT_WIDTH - TEXT_PADDING_X * 2) as string[];
  const linesPerPage = 38;
  let index = 0;
  let currentY = y;

  while (index < lines.length) {
    const chunkSize = Math.min(linesPerPage, lines.length - index);
    const boxHeight = Math.max(
      TEXT_SECTION_MIN_HEIGHT,
      TEXT_PADDING_TOP + chunkSize * TEXT_LINE_HEIGHT + 18
    );
    const sectionHeight = SECTION_TITLE_HEIGHT + 10 + boxHeight + SECTION_GAP;
    currentY = ensureSpace(doc, currentY, sectionHeight, meta);

    drawSectionTitle(doc, title, currentY);
    currentY += 34;

    setColor(doc, "draw", COLORS.grayBorder);
    setColor(doc, "fill", COLORS.cardBg);
    doc.roundedRect(CONTENT_LEFT, currentY, CONTENT_WIDTH, boxHeight, 8, 8, "FD");

    setColor(doc, "text", COLORS.grayDark);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.2);
    doc.text(lines.slice(index, index + chunkSize), CONTENT_LEFT + TEXT_PADDING_X, currentY + TEXT_PADDING_TOP);

    index += chunkSize;
    currentY += boxHeight + SECTION_GAP;
  }

  return currentY;
}

function drawSignatureSection(doc: jsPDF, y: number, meta: LayoutMeta) {
  const startY = ensureSpace(doc, y, SIGNATURE_HEIGHT, meta);
  drawSectionTitle(doc, "Assinaturas", startY);

  const lineY = startY + 72;
  const blockWidth = 146;
  const gap = 36;

  [
    { label: "Cliente / Proponente", x: CONTENT_LEFT },
    { label: "Corretor", x: CONTENT_LEFT + blockWidth + gap },
    {
      label: branding.clientName,
      x: CONTENT_LEFT + (blockWidth + gap) * 2,
    },
  ].forEach((item) => {
    setColor(doc, "draw", COLORS.grayMid);
    doc.line(item.x, lineY, item.x + blockWidth, lineY);
    setColor(doc, "text", COLORS.grayDark);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text(item.label, item.x + blockWidth / 2, lineY + 15, {
      align: "center",
    });
  });

  return lineY + 24;
}

function drawLoteSection(
  doc: jsPDF,
  y: number,
  payload: {
    quadra: string;
    lote: string;
    valor: string;
    unidades: UnidadePdf[];
  },
  meta: LayoutMeta
) {
  const lotData = resolveLotData(payload);
  const startY = ensureSpace(doc, y, 88, meta);
  drawSectionTitle(doc, "Dados do lote", startY);
  return drawFieldRow(
    doc,
    startY + 34,
    [
      { label: "Quadra", value: lotData.quadra },
      { label: "Lote", value: lotData.lote },
      { label: "Valor total", value: lotData.valor },
    ],
    meta
  );
}

function drawClienteSection(
  doc: jsPDF,
  y: number,
  payload: IdentificacaoPdf,
  meta: LayoutMeta
) {
  const startY = ensureSpace(doc, y, 194, meta);
  drawSectionTitle(doc, "Identificação do cliente", startY);
  let currentY = startY + 34;

  currentY = drawFieldRow(
    doc,
    currentY,
    [
      { label: "Nome", value: safeText(payload.clienteNome) },
      { label: "CPF", value: safeText(payload.clienteCpf) },
    ],
    meta,
    [2, 1]
  );

  currentY = drawFieldRow(
    doc,
    currentY,
    [
      { label: "Telefone", value: safeText(payload.clienteTelefone) },
      { label: "E-mail", value: safeText(payload.clienteEmail) },
    ],
    meta
  );

  return drawFieldRow(
    doc,
    currentY,
    [
      { label: "Profissão", value: safeText(payload.clienteProfissao) },
      { label: "Estado civil", value: safeText(payload.clienteEstadoCivil) },
    ],
    meta
  );
}

function drawCorretorSection(
  doc: jsPDF,
  y: number,
  payload: IdentificacaoPdf,
  meta: LayoutMeta
) {
  const startY = ensureSpace(doc, y, 92, meta);
  drawSectionTitle(doc, "Identificação do corretor", startY);
  return drawFieldRow(
    doc,
    startY + 34,
    [
      { label: "Nome do corretor", value: safeText(payload.corretor) },
      { label: "CRECI", value: safeText(payload.creci) },
      { label: "Imobiliária", value: safeText(payload.imobiliaria) },
    ],
    meta,
    [1.6, 0.8, 1.2]
  );
}

function drawPermutaVeiculoSection(
  doc: jsPDF,
  y: number,
  meta: LayoutMeta,
  permuta?: { valor: string; descricao: string },
  veiculo?: { valor: string; descricao: string }
) {
  const items: Field[] = [];

  if (permuta) {
    items.push(
      { label: "Permuta", value: safeText(permuta.valor) },
      { label: "Descrição da permuta", value: safeText(permuta.descricao) }
    );
  }

  if (veiculo) {
    items.push(
      { label: "Veículo", value: safeText(veiculo.valor) },
      { label: "Descrição do veículo", value: safeText(veiculo.descricao) }
    );
  }

  if (!items.length) return y;

  const startY = ensureSpace(doc, y, 150, meta);
  drawSectionTitle(doc, "Permuta e ativos", startY);

  let currentY = startY + 34;
  for (let i = 0; i < items.length; i += 2) {
    currentY = drawFieldRow(doc, currentY, items.slice(i, i + 2), meta);
  }

  return currentY;
}

function drawConditionSection(
  doc: jsPDF,
  y: number,
  title: string,
  rows: Array<{
    title: string;
    fields: Field[];
    proportions?: number[];
  }>,
  meta: LayoutMeta
) {
  const startY = ensureSpace(doc, y, 92, meta);
  drawSectionTitle(doc, title, startY);
  let currentY = startY + 34;

  rows.forEach((row) => {
    currentY = drawFieldRow(doc, currentY, row.fields, meta, row.proportions);
  });

  return currentY;
}

function drawProposalLayout(doc: jsPDF, payload: PdfPropostaPayload) {
  const meta: LayoutMeta = {
    titulo: "TERMO DE PROPOSTA",
    subtitulo: "Documento comercial institucional",
    data: payload.data,
  };
  const textBlocks = dedupeTextBlocks(payload.detalhesNegociacao, payload.observacao);
  const lotData = resolveLotData(payload);

  let y = PAGE_START_Y;
  y = drawMetricCards(
    doc,
    y,
    "Resumo executivo",
    [
      { label: "Valor do negócio", value: lotData.valor },
      { label: "Entrada", value: safeText(payload.entrada?.valor) },
      {
        label: "Mensais",
        value: safeText(payload.mensais?.valorParcela),
      },
      {
        label: "Balão",
        value: payload.balao ? safeText(payload.balao.valorParcela) : "Fluxo sem balão",
      },
    ],
    meta
  );
  y = drawLoteSection(doc, y, payload, meta);
  y = drawClienteSection(doc, y, payload, meta);
  y = drawCorretorSection(doc, y, payload, meta);

  y = startNewPage(doc, meta);
  y = drawConditionSection(
    doc,
    y,
    "Condição financeira",
    [
      {
        title: "Entrada",
        fields: [
          { label: "Entrada", value: safeText(payload.entrada?.valor) },
          {
            label: "Quantidade de parcelas",
            value: safeText(payload.entrada?.quantidadeParcelas),
          },
          {
            label: "Valor da parcela",
            value: safeText(payload.entrada?.valorParcela),
          },
          {
            label: "Primeiro vencimento",
            value: safeText(payload.entrada?.primeiroVencimento),
          },
        ],
      },
      {
        title: "Mensais",
        fields: [
          {
            label: "Mensais",
            value: safeText(payload.mensais?.quantidadeParcelas),
          },
          {
            label: "Valor da parcela",
            value: safeText(payload.mensais?.valorParcela),
          },
          {
            label: "Primeiro vencimento",
            value: safeText(payload.mensais?.primeiroVencimento),
          },
        ],
        proportions: [1, 1, 1.1],
      },
      ...(payload.balao
        ? [
            {
              title: "Balão",
              fields: [
                { label: "Tipo", value: safeText(payload.balao.tipo) },
                {
                  label: "Quantidade de parcelas",
                  value: safeText(payload.balao.quantidadeParcelas),
                },
                {
                  label: "Valor da parcela",
                  value: safeText(payload.balao.valorParcela),
                },
                {
                  label: "Primeiro vencimento",
                  value: safeText(payload.balao.primeiroVencimento),
                },
              ],
            },
          ]
        : []),
    ],
    meta
  );
  y = drawPermutaVeiculoSection(doc, y, meta, payload.permuta);

  y = startNewPage(doc, meta);
  y = drawTextSection(doc, y, "Detalhes da negociação", textBlocks.detalhes, meta);
  y = drawTextSection(doc, y, "Observação", textBlocks.observacao, meta);
  drawSignatureSection(doc, y, meta);
}

function drawContrapropostaLayout(doc: jsPDF, payload: PdfContrapropostaPayload) {
  const meta: LayoutMeta = {
    titulo: "TERMO DE CONTRAPROPOSTA",
    subtitulo: "Documento comercial institucional",
    data: payload.data,
  };
  const textBlocks = dedupeTextBlocks(payload.detalhesNegociacao, payload.observacao);
  const lotData = resolveLotData(payload);
  const hasBalao =
    hasMeaningfulValue(payload.condicaoAprovada.balaoQuantidade) &&
    !/^0x$/i.test(safeText(payload.condicaoAprovada.balaoQuantidade)) &&
    parseCurrencyValue(payload.condicaoAprovada.balaoValor) > 0;

  let y = PAGE_START_Y;
  y = drawMetricCards(
    doc,
    y,
    "Resumo executivo",
    [
      { label: "Valor do negócio", value: lotData.valor },
      {
        label: "Entrada",
        value: safeText(payload.condicaoAprovada.entrada),
      },
      {
        label: "Mensais",
        value: safeText(payload.condicaoAprovada.mensaisValor),
      },
      {
        label: "Balão",
        value: hasBalao ? safeText(payload.condicaoAprovada.balaoValor) : "Fluxo sem balão",
      },
    ],
    meta
  );
  y = drawLoteSection(doc, y, payload, meta);
  y = drawClienteSection(doc, y, payload, meta);
  y = drawCorretorSection(doc, y, payload, meta);

  y = startNewPage(doc, meta);
  y = drawConditionSection(
    doc,
    y,
    "Condição aprovada",
    [
      {
        title: "Aprovação",
        fields: [
          {
            label: "Valor aprovado",
            value: safeText(payload.condicaoAprovada.valor),
          },
          { label: "Entrada", value: safeText(payload.condicaoAprovada.entrada) },
          { label: "Validade", value: safeText(payload.condicaoAprovada.validade) },
        ],
      },
      {
        title: "Mensais",
        fields: [
          {
            label: "Mensais",
            value: safeText(payload.condicaoAprovada.mensaisQuantidade),
          },
          {
            label: "Valor da parcela",
            value: safeText(payload.condicaoAprovada.mensaisValor),
          },
        ],
      },
      ...(hasBalao
        ? [
            {
              title: "Balão",
              fields: [
                {
                  label: "Tipo",
                  value: safeText(payload.condicaoAprovada.balaoTipo),
                },
                {
                  label: "Quantidade de parcelas",
                  value: safeText(payload.condicaoAprovada.balaoQuantidade),
                },
                {
                  label: "Valor da parcela",
                  value: safeText(payload.condicaoAprovada.balaoValor),
                },
              ],
            },
          ]
        : []),
    ],
    meta
  );
  y = drawPermutaVeiculoSection(doc, y, meta, payload.permuta);

  y = startNewPage(doc, meta);
  y = drawTextSection(doc, y, "Detalhes da negociação", textBlocks.detalhes, meta);
  y = drawTextSection(doc, y, "Observação", textBlocks.observacao, meta);
  drawSignatureSection(doc, y, meta);
}

function drawSimulacaoLayout(doc: jsPDF, payload: PdfSimulacaoPayload) {
  const meta: LayoutMeta = {
    titulo: "SIMULAÇÃO COMERCIAL",
    subtitulo: "Documento comercial institucional",
    data: payload.data,
  };
  const textBlocks = dedupeTextBlocks(payload.detalhesNegociacao, payload.observacao);
  const lotData = resolveLotData(payload);
  const temBalao =
    !!payload.balao &&
    hasMeaningfulValue(payload.balao.quantidadeParcelas) &&
    parseCurrencyValue(payload.balao.valorParcela) > 0;

  let y = PAGE_START_Y;
  y = drawMetricCards(
    doc,
    y,
    "Resumo executivo",
    [
      { label: "Valor do negócio", value: lotData.valor },
      { label: "Entrada", value: safeText(payload.entrada) },
      {
        label: "Saldo final",
        value: payload.saldoFinal ? safeText(payload.saldoFinal.valor) : "Não aplicado",
      },
      {
        label: "Base final",
        value: safeText(payload.baseParcelasEBaloes),
      },
    ],
    meta
  );
  y = drawLoteSection(doc, y, payload, meta);
  y = drawClienteSection(doc, y, payload, meta);
  y = drawCorretorSection(doc, y, payload, meta);

  y = startNewPage(doc, meta);
  y = drawConditionSection(
    doc,
    y,
    "Condição financeira",
    [
      {
        title: "Entrada e saldo",
        fields: [
          { label: "Entrada", value: safeText(payload.entrada) },
          {
            label: "Saldo final na entrega",
            value: payload.saldoFinal ? safeText(payload.saldoFinal.valor) : "Não aplicado",
          },
          {
            label: "Forma prevista",
            value: payload.saldoFinal ? safeText(payload.saldoFinal.forma) : "Sem saldo final",
          },
          {
            label: "Vencimento",
            value: payload.saldoFinal ? safeText(payload.saldoFinal.vencimento) : "-",
          },
        ],
      },
      {
        title: "Mensais",
        fields: [
          {
            label: "Mensais",
            value: safeText(payload.mensais.quantidadeParcelas),
          },
          {
            label: "Valor da parcela",
            value: safeText(payload.mensais.valorParcela),
          },
        ],
      },
      ...(temBalao
        ? [
            {
              title: "Balão",
              fields: [
                { label: "Tipo", value: safeText(payload.balao?.tipo) },
                {
                  label: "Quantidade de parcelas",
                  value: safeText(payload.balao?.quantidadeParcelas),
                },
                {
                  label: "Valor da parcela",
                  value: safeText(payload.balao?.valorParcela),
                },
              ],
            },
          ]
        : []),
    ],
    meta
  );
  y = drawPermutaVeiculoSection(doc, y, meta, payload.permuta, payload.veiculo);
  y = drawMetricCards(
    doc,
    y,
    "Principais números",
    temBalao
      ? [
          { label: "Valor total", value: lotData.valor },
          { label: "Saldo remanescente", value: safeText(payload.saldoRemanescente) },
          {
            label: "Base para mensais e balões",
            value: safeText(payload.baseParcelasEBaloes),
          },
          {
            label: "Estrutura de balão",
            value: safeText(payload.balao?.quantidadeParcelas),
          },
        ]
      : [
          { label: "Valor total", value: lotData.valor },
          { label: "Saldo remanescente", value: safeText(payload.saldoRemanescente) },
          {
            label: "Base para mensais",
            value: safeText(payload.baseParcelasEBaloes),
          },
        ],
    meta
  );

  y = drawTextSection(doc, y, "Detalhes da negociação", textBlocks.detalhes, meta);
  drawTextSection(doc, y, "Observação", textBlocks.observacao, meta);
}

export function gerarPdfProposta(dados: PdfPropostaPayload) {
  const doc = createDocument({
    titulo: "TERMO DE PROPOSTA",
    subtitulo: "Documento comercial institucional",
    data: dados.data,
    clienteLogoDataUrl: dados.clienteLogoDataUrl,
  });
  drawProposalLayout(doc, dados);
  doc.save("proposta-vivendas.pdf");
}

export function gerarPdfContraproposta(dados: PdfContrapropostaPayload) {
  const doc = createDocument({
    titulo: "TERMO DE CONTRAPROPOSTA",
    subtitulo: "Documento comercial institucional",
    data: dados.data,
    clienteLogoDataUrl: dados.clienteLogoDataUrl,
  });
  drawContrapropostaLayout(doc, dados);
  doc.save("contraproposta-vivendas.pdf");
}

export function gerarPdfSimulacao(dados: PdfSimulacaoPayload) {
  const doc = createDocument({
    titulo: "SIMULAÇÃO COMERCIAL",
    subtitulo: "Documento comercial institucional",
    data: dados.data,
  });
  drawSimulacaoLayout(doc, dados);
  doc.save("simulacao-vivendas.pdf");
}
