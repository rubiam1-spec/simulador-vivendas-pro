import jsPDF from "jspdf"

import logoBomm from "../assets/logo-bomm.png"
import logoVivendas from "../assets/logo-vivendas.png"

type UnidadePdf = {
  quadra: string
  lote: string
  valor: string
}

type IdentificacaoPdf = {
  clienteNome: string
  clienteCpf?: string
  clienteTelefone?: string
  clienteEmail?: string
  clienteProfissao?: string
  clienteEstadoCivil?: string
  corretor: string
  creci?: string
  imobiliaria: string
}

type Field = {
  label: string
  value: string
}

type LayoutMeta = {
  titulo: string
  data: string
}

type DadosLoteNormalizados = {
  data: string
  quadra: string
  lote: string
  valor: string
}

type IdentificacaoNormalizada = {
  cliente: IdentificacaoPdf
  corretor: {
    nome: string
    creci: string
    imobiliaria: string
  }
}

type CondicaoPropostaNormalizada = {
  entrada: Field[]
  mensais: Field[]
  balao: Field[]
}

type CondicaoContrapropostaNormalizada = {
  aprovacao: Field[]
  mensais: Field[]
  balao: Field[]
}

type PermutaNormalizada = {
  valor: string
  descricao: string
} | null

type PropostaNormalizada = {
  meta: LayoutMeta
  lote: DadosLoteNormalizados
  identificacao: IdentificacaoNormalizada
  condicao: CondicaoPropostaNormalizada
  permuta: PermutaNormalizada
  detalhesNegociacao?: string
  observacao?: string
}

type ContrapropostaNormalizada = {
  meta: LayoutMeta
  lote: DadosLoteNormalizados
  identificacao: IdentificacaoNormalizada
  condicao: CondicaoContrapropostaNormalizada
  permuta: PermutaNormalizada
  detalhesNegociacao?: string
  observacao?: string
}

const PAGE_WIDTH = 595
const PAGE_HEIGHT = 842
const HEADER_HEIGHT = 114
const PAGE_START_Y = 178
const CONTENT_LEFT = 42
const CONTENT_WIDTH = 511
const CONTENT_BOTTOM = 748
const FOOTER_Y = 812
const SECTION_TITLE_HEIGHT = 24
const SECTION_BODY_GAP = 12
const SECTION_HEADER_GAP = 34
const FIELD_GAP = 12
const DEFAULT_FIELD_MIN_HEIGHT = 46
const TEXT_PADDING_X = 12
const TEXT_PADDING_TOP = 24
const TEXT_LINE_HEIGHT = 14
const TEXT_SECTION_MIN_BOX_HEIGHT = 72
const SECTION_SPACING = 18
const SIGNATURE_SECTION_HEIGHT = 124

const COLORS = {
  greenDark: [27, 67, 50] as const,
  greenMid: [45, 106, 79] as const,
  greenAccent: [82, 183, 136] as const,
  grayDark: [31, 41, 55] as const,
  grayMid: [107, 114, 128] as const,
  grayBorder: [229, 231, 235] as const,
  cardBg: [249, 250, 251] as const,
  white: [255, 255, 255] as const,
}

export type PdfPropostaPayload = IdentificacaoPdf & {
  data: string
  quadra: string
  lote: string
  valor: string
  unidades: UnidadePdf[]
  entrada?: {
    valor: string
    quantidadeParcelas: string
    valorParcela: string
    primeiroVencimento: string
  }
  mensais?: {
    quantidadeParcelas: string
    valorParcela: string
    primeiroVencimento: string
  }
  balao?: {
    tipo: string
    quantidadeParcelas: string
    valorParcela: string
    primeiroVencimento: string
  }
  permuta?: {
    valor: string
    descricao: string
  }
  observacao?: string
  detalhesNegociacao?: string | string[]
}

export type PdfContrapropostaPayload = IdentificacaoPdf & {
  data: string
  quadra: string
  lote: string
  valor: string
  unidades: UnidadePdf[]
  condicaoAprovada: {
    valor: string
    entrada: string
    mensaisQuantidade: string
    mensaisValor: string
    balaoTipo: string
    balaoQuantidade: string
    balaoValor: string
    validade?: string
  }
  permuta?: {
    valor: string
    descricao: string
  }
  observacao?: string
  detalhesNegociacao?: string | string[]
}

function cleanString(valor?: string) {
  return (valor || "").trim()
}

function hasMeaningfulValue(valor?: string) {
  const texto = cleanString(valor)
  return Boolean(texto && texto !== "-")
}

function safeText(valor?: string) {
  return hasMeaningfulValue(valor) ? cleanString(valor) : "-"
}

function normalizeListText(valor?: string) {
  return cleanString(valor)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .join(", ")
}

function sameNormalizedList(a?: string, b?: string) {
  return normalizeListText(a) === normalizeListText(b)
}

function parseCurrencyValue(valor?: string) {
  const texto = cleanString(valor)
  if (!texto) return 0

  const numero = texto
    .replace(/\s/g, "")
    .replace(/R\$/gi, "")
    .replace(/\./g, "")
    .replace(",", ".")
    .replace(/[^\d.-]/g, "")

  const convertido = Number(numero)
  return Number.isFinite(convertido) ? convertido : 0
}

function formatCurrency(valor: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(valor)
}

function normalizeLongText(valor?: string | string[]) {
  if (Array.isArray(valor)) {
    const linhas = valor.map((linha) => linha.replace(/\s+$/, ""))

    while (linhas.length && !linhas[0].trim()) {
      linhas.shift()
    }

    while (linhas.length && !linhas[linhas.length - 1].trim()) {
      linhas.pop()
    }

    return linhas.join("\n").trim()
  }

  return cleanString(valor)
}

function normalizeUnits(unidades: UnidadePdf[]) {
  return unidades
    .map((unidade) => ({
      quadra: safeText(unidade.quadra),
      lote: safeText(unidade.lote),
      valor: safeText(unidade.valor),
    }))
    .filter((unidade) => unidade.quadra !== "-" || unidade.lote !== "-" || unidade.valor !== "-")
}

function consolidateUnits(unidades: UnidadePdf[]) {
  const normalizadas = normalizeUnits(unidades)

  if (!normalizadas.length) {
    return {
      quadra: "-",
      lote: "-",
      valorTotal: "-",
    }
  }

  const quadras = Array.from(
    new Set(
      normalizadas
        .map((unidade) => unidade.quadra)
        .filter((quadra) => quadra !== "-")
    )
  )

  const lotes = normalizadas
    .map((unidade) => unidade.lote)
    .filter((lote) => lote !== "-")

  const valorTotal = normalizadas.reduce(
    (total, unidade) => total + parseCurrencyValue(unidade.valor),
    0
  )

  return {
    quadra: quadras.length ? quadras.join(", ") : "-",
    lote: lotes.length ? lotes.join(", ") : "-",
    valorTotal: valorTotal > 0 ? formatCurrency(valorTotal) : "-",
  }
}

function resolveLotData(payload: {
  data: string
  quadra: string
  lote: string
  valor: string
  unidades: UnidadePdf[]
}): DadosLoteNormalizados {
  const consolidado = consolidateUnits(payload.unidades)
  const valorPrincipal = parseCurrencyValue(payload.valor)
  const valorFallback = parseCurrencyValue(consolidado.valorTotal)
  const quadraPrincipal = safeText(payload.quadra)
  const lotePrincipal = safeText(payload.lote)
  const usarQuadraConsolidada =
    consolidado.quadra !== "-" &&
    (!hasMeaningfulValue(payload.quadra) || !sameNormalizedList(payload.quadra, consolidado.quadra))
  const usarLoteConsolidado =
    consolidado.lote !== "-" &&
    (!hasMeaningfulValue(payload.lote) || !sameNormalizedList(payload.lote, consolidado.lote))

  return {
    data: safeText(payload.data),
    quadra: usarQuadraConsolidada ? consolidado.quadra : quadraPrincipal,
    lote: usarLoteConsolidado ? consolidado.lote : lotePrincipal,
    valor:
      valorFallback > 0 && (valorPrincipal <= 0 || cleanString(payload.valor) !== consolidado.valorTotal)
        ? consolidado.valorTotal
        : valorPrincipal > 0
          ? cleanString(payload.valor)
          : valorFallback > 0
            ? consolidado.valorTotal
            : "-",
  }
}

function resolveIdentificacao(payload: IdentificacaoPdf): IdentificacaoNormalizada {
  return {
    cliente: {
      clienteNome: safeText(payload.clienteNome),
      clienteCpf: safeText(payload.clienteCpf),
      clienteTelefone: safeText(payload.clienteTelefone),
      clienteEmail: safeText(payload.clienteEmail),
      clienteProfissao: safeText(payload.clienteProfissao),
      clienteEstadoCivil: safeText(payload.clienteEstadoCivil),
      corretor: safeText(payload.corretor),
      creci: safeText(payload.creci),
      imobiliaria: safeText(payload.imobiliaria),
    },
    corretor: {
      nome: safeText(payload.corretor),
      creci: safeText(payload.creci),
      imobiliaria: safeText(payload.imobiliaria),
    },
  }
}

function normalizePermuta(permuta?: { valor: string; descricao: string }): PermutaNormalizada {
  if (!permuta) return null

  const valor = safeText(permuta.valor)
  const descricao = safeText(permuta.descricao)

  if (valor === "-" && descricao === "-") {
    return null
  }

  return { valor, descricao }
}

function sanitizeDetails(detalhes?: string | string[], observacao?: string) {
  const textoDetalhes = normalizeLongText(detalhes)
  if (!textoDetalhes || textoDetalhes === "-") {
    return undefined
  }

  const observacaoNormalizada = normalizeLongText(observacao).toLowerCase()
  const linhas = textoDetalhes
    .split("\n")
    .map((linha) => linha.trimEnd())
    .filter((linha) => {
      const comparacao = linha.trim().toLowerCase()
      if (!comparacao) return true
      if (comparacao.startsWith("observação") || comparacao.startsWith("observacao")) {
        return false
      }
      if (observacaoNormalizada && comparacao === observacaoNormalizada) {
        return false
      }
      return true
    })

  const limpo = normalizeLongText(linhas)
  return limpo && limpo !== "-" ? limpo : undefined
}

function sanitizeObservation(observacao?: string) {
  const texto = normalizeLongText(observacao)
  return texto && texto !== "-" ? texto : undefined
}

function normalizePropostaData(payload: PdfPropostaPayload): PropostaNormalizada {
  const lote = resolveLotData(payload)
  const identificacao = resolveIdentificacao(payload)
  const observacao = sanitizeObservation(payload.observacao)

  return {
    meta: {
      titulo: "TERMO DE PROPOSTA",
      data: lote.data,
    },
    lote,
    identificacao,
    condicao: {
      entrada: [
        { label: "Entrada Total", value: safeText(payload.entrada?.valor) },
        { label: "Entrada: Qtd. Parcelas", value: safeText(payload.entrada?.quantidadeParcelas) },
        { label: "Entrada: Valor da Parcela", value: safeText(payload.entrada?.valorParcela) },
        { label: "Entrada: Primeiro Vencimento", value: safeText(payload.entrada?.primeiroVencimento) },
      ],
      mensais: [
        { label: "Mensais: Qtd. Parcelas", value: safeText(payload.mensais?.quantidadeParcelas) },
        { label: "Mensais: Valor da Parcela", value: safeText(payload.mensais?.valorParcela) },
        { label: "Mensais: Primeiro Vencimento", value: safeText(payload.mensais?.primeiroVencimento) },
      ],
      balao: [
        { label: "Balão: Tipo", value: safeText(payload.balao?.tipo) },
        { label: "Balão: Qtd. Parcelas", value: safeText(payload.balao?.quantidadeParcelas) },
        { label: "Balão: Valor da Parcela", value: safeText(payload.balao?.valorParcela) },
        { label: "Balão: Primeiro Vencimento", value: safeText(payload.balao?.primeiroVencimento) },
      ],
    },
    permuta: normalizePermuta(payload.permuta),
    detalhesNegociacao: sanitizeDetails(payload.detalhesNegociacao, observacao),
    observacao,
  }
}

function normalizeContrapropostaData(
  payload: PdfContrapropostaPayload
): ContrapropostaNormalizada {
  const lote = resolveLotData(payload)
  const identificacao = resolveIdentificacao(payload)
  const observacao = sanitizeObservation(payload.observacao)
  const valorAprovado = parseCurrencyValue(payload.condicaoAprovada.valor)
  const valorLote = parseCurrencyValue(lote.valor)

  return {
    meta: {
      titulo: "TERMO DE CONTRAPROPOSTA",
      data: lote.data,
    },
    lote,
    identificacao,
    condicao: {
      aprovacao: [
        {
          label: "Valor Aprovado",
          value:
            valorAprovado > 0
              ? safeText(payload.condicaoAprovada.valor)
              : valorLote > 0
                ? lote.valor
                : "-",
        },
        { label: "Entrada", value: safeText(payload.condicaoAprovada.entrada) },
      ],
      mensais: [
        {
          label: "Mensais: Qtd. Parcelas",
          value: safeText(payload.condicaoAprovada.mensaisQuantidade),
        },
        {
          label: "Mensais: Valor da Parcela",
          value: safeText(payload.condicaoAprovada.mensaisValor),
        },
        {
          label: "Validade",
          value: safeText(payload.condicaoAprovada.validade),
        },
      ],
      balao: [
        { label: "Balão: Tipo", value: safeText(payload.condicaoAprovada.balaoTipo) },
        {
          label: "Balão: Qtd. Parcelas",
          value: safeText(payload.condicaoAprovada.balaoQuantidade),
        },
        {
          label: "Balão: Valor da Parcela",
          value: safeText(payload.condicaoAprovada.balaoValor),
        },
      ],
    },
    permuta: normalizePermuta(payload.permuta),
    detalhesNegociacao: sanitizeDetails(payload.detalhesNegociacao, observacao),
    observacao,
  }
}

function setColor(doc: jsPDF, type: "fill" | "draw" | "text", rgb: readonly number[]) {
  if (type === "fill") doc.setFillColor(rgb[0], rgb[1], rgb[2])
  if (type === "draw") doc.setDrawColor(rgb[0], rgb[1], rgb[2])
  if (type === "text") doc.setTextColor(rgb[0], rgb[1], rgb[2])
}

function createDocument(meta: LayoutMeta) {
  const doc = new jsPDF({
    unit: "pt",
    format: "a4",
  })

  renderPageFrame(doc, meta)
  return doc
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
  const properties = doc.getImageProperties(imageData)
  const sourceWidth = properties.width || maxWidth
  const sourceHeight = properties.height || maxHeight
  const ratio = Math.min(maxWidth / sourceWidth, maxHeight / sourceHeight)
  const width = sourceWidth * ratio
  const height = sourceHeight * ratio

  doc.addImage(
    imageData,
    format,
    x + (maxWidth - width) / 2,
    y + (maxHeight - height) / 2,
    width,
    height
  )
}

function renderPageFrame(doc: jsPDF, meta: LayoutMeta) {
  setColor(doc, "fill", COLORS.white)
  doc.rect(0, 0, PAGE_WIDTH, PAGE_HEIGHT, "F")

  setColor(doc, "fill", COLORS.greenDark)
  doc.rect(0, 0, PAGE_WIDTH, HEADER_HEIGHT, "F")

  try {
    addLogo(doc, logoVivendas, "PNG", CONTENT_LEFT, 20, 128, 44)
    addLogo(doc, logoBomm, "PNG", PAGE_WIDTH - CONTENT_LEFT - 118, 20, 118, 44)
  } catch {
    setColor(doc, "text", COLORS.white)
    doc.setFont("helvetica", "bold")
    doc.setFontSize(18)
    doc.text("Vivendas do Bosque", CONTENT_LEFT, 42)
    doc.text("BOMM", PAGE_WIDTH - CONTENT_LEFT, 42, { align: "right" })
  }

  setColor(doc, "text", COLORS.white)
  doc.setFont("helvetica", "normal")
  doc.setFontSize(10)
  doc.text("Empreendimento", PAGE_WIDTH / 2, 30, { align: "center" })

  doc.setFont("helvetica", "bold")
  doc.setFontSize(22)
  doc.text(meta.titulo, PAGE_WIDTH / 2, 58, { align: "center" })

  doc.setFont("helvetica", "normal")
  doc.setFontSize(11)
  doc.text("Vivendas do Bosque", PAGE_WIDTH / 2, 78, { align: "center" })

  setColor(doc, "draw", COLORS.greenAccent)
  doc.setLineWidth(1.1)
  doc.line(CONTENT_LEFT, HEADER_HEIGHT - 18, PAGE_WIDTH - CONTENT_LEFT, HEADER_HEIGHT - 18)

  setColor(doc, "text", COLORS.grayMid)
  doc.setFont("helvetica", "normal")
  doc.setFontSize(10)
  doc.text("Empreendimento: Vivendas do Bosque", CONTENT_LEFT, 146)
  doc.text(`Data do documento: ${safeText(meta.data)}`, PAGE_WIDTH - CONTENT_LEFT, 146, {
    align: "right",
  })

  setColor(doc, "draw", COLORS.grayBorder)
  doc.setLineWidth(1)
  doc.line(CONTENT_LEFT, 156, PAGE_WIDTH - CONTENT_LEFT, 156)

  doc.setFont("helvetica", "normal")
  doc.setFontSize(7)
  setColor(doc, "text", COLORS.grayMid)
  doc.text(
    "Parcelas corrigidas por INCC até a entrega e, após a entrega, por IPCA.",
    CONTENT_LEFT,
    FOOTER_Y
  )
  doc.text("BOMM Urbanizadora", PAGE_WIDTH - CONTENT_LEFT, FOOTER_Y, { align: "right" })
}

function startNewPage(doc: jsPDF, meta: LayoutMeta) {
  doc.addPage()
  renderPageFrame(doc, meta)
  return PAGE_START_Y
}

function ensureSpace(doc: jsPDF, y: number, requiredHeight: number, meta: LayoutMeta) {
  if (y + requiredHeight <= CONTENT_BOTTOM) {
    return y
  }

  return startNewPage(doc, meta)
}

function drawSectionTitle(doc: jsPDF, title: string, y: number) {
  setColor(doc, "fill", COLORS.cardBg)
  doc.roundedRect(CONTENT_LEFT, y, CONTENT_WIDTH, SECTION_TITLE_HEIGHT, 8, 8, "F")
  setColor(doc, "draw", COLORS.greenAccent)
  doc.setLineWidth(1)
  doc.line(CONTENT_LEFT, y + SECTION_TITLE_HEIGHT, CONTENT_LEFT + 70, y + SECTION_TITLE_HEIGHT)
  setColor(doc, "text", COLORS.greenDark)
  doc.setFont("helvetica", "bold")
  doc.setFontSize(11)
  doc.text(title.toUpperCase(), CONTENT_LEFT + 14, y + 16)
}

function drawCard(doc: jsPDF, x: number, y: number, width: number, height: number) {
  setColor(doc, "draw", COLORS.grayBorder)
  setColor(doc, "fill", COLORS.cardBg)
  doc.roundedRect(x, y, width, height, 8, 8, "FD")
}

function getRowMetrics(doc: jsPDF, fields: Field[], forcedHeights?: number[]) {
  const totalGap = FIELD_GAP * (fields.length - 1)
  const fieldWidth = (CONTENT_WIDTH - totalGap) / fields.length
  const heights =
    forcedHeights ||
    fields.map((field) => {
      const linhas = doc.splitTextToSize(safeText(field.value), fieldWidth - TEXT_PADDING_X * 2) as string[]
      return Math.max(DEFAULT_FIELD_MIN_HEIGHT, 32 + linhas.length * 12)
    })

  return {
    fieldWidth,
    heights,
    rowHeight: Math.max(...heights),
  }
}

function drawFieldBox(
  doc: jsPDF,
  x: number,
  y: number,
  width: number,
  height: number,
  field: Field
) {
  drawCard(doc, x, y, width, height)

  doc.setFont("helvetica", "bold")
  doc.setFontSize(7.5)
  setColor(doc, "text", COLORS.grayMid)
  doc.text(field.label.toUpperCase(), x + TEXT_PADDING_X, y + 14)

  doc.setFont("helvetica", "normal")
  doc.setFontSize(9.5)
  setColor(doc, "text", COLORS.grayDark)

  const linhas = doc.splitTextToSize(safeText(field.value), width - TEXT_PADDING_X * 2) as string[]
  doc.text(linhas, x + TEXT_PADDING_X, y + 31)
}

function drawFieldRow(
  doc: jsPDF,
  y: number,
  fields: Field[],
  meta: LayoutMeta,
  forcedHeights?: number[]
) {
  const { fieldWidth, heights, rowHeight } = getRowMetrics(doc, fields, forcedHeights)
  const startY = ensureSpace(doc, y, rowHeight + SECTION_BODY_GAP, meta)

  fields.forEach((field, index) => {
    const x = CONTENT_LEFT + index * (fieldWidth + FIELD_GAP)
    drawFieldBox(doc, x, startY, fieldWidth, heights[index] ?? rowHeight, field)
  })

  return startY + rowHeight + SECTION_BODY_GAP
}

function splitParagraphLines(doc: jsPDF, text: string, width: number) {
  const linhas: string[] = []

  text.split(/\r?\n/).forEach((paragrafo) => {
    if (!paragrafo.trim()) {
      linhas.push("")
      return
    }

    const quebradas = doc.splitTextToSize(paragrafo, width) as string[]
    linhas.push(...quebradas)
  })

  while (linhas.length && !linhas[0].trim()) {
    linhas.shift()
  }

  while (linhas.length && !linhas[linhas.length - 1].trim()) {
    linhas.pop()
  }

  return linhas
}

function drawTextSection(
  doc: jsPDF,
  y: number,
  title: string,
  content: string | undefined,
  meta: LayoutMeta
) {
  if (!content) {
    return y
  }

  const linhas = splitParagraphLines(doc, content, CONTENT_WIDTH - TEXT_PADDING_X * 2)
  if (!linhas.length) {
    return y
  }

  let indice = 0
  let currentY = y

  while (indice < linhas.length) {
    currentY = ensureSpace(
      doc,
      currentY,
      SECTION_HEADER_GAP + TEXT_SECTION_MIN_BOX_HEIGHT + SECTION_SPACING,
      meta
    )

    const availableBoxHeight = CONTENT_BOTTOM - (currentY + SECTION_HEADER_GAP)
    const maxLines = Math.max(1, Math.floor((availableBoxHeight - 28) / TEXT_LINE_HEIGHT))
    const chunk = linhas.slice(indice, indice + maxLines)
    const boxHeight = Math.max(TEXT_SECTION_MIN_BOX_HEIGHT, 28 + chunk.length * TEXT_LINE_HEIGHT)

    drawSectionTitle(doc, title, currentY)
    currentY += SECTION_HEADER_GAP
    drawCard(doc, CONTENT_LEFT, currentY, CONTENT_WIDTH, boxHeight)

    doc.setFont("helvetica", "normal")
    doc.setFontSize(9)
    setColor(doc, "text", COLORS.grayDark)
    doc.text(chunk, CONTENT_LEFT + TEXT_PADDING_X, currentY + TEXT_PADDING_TOP)

    indice += chunk.length
    currentY += boxHeight + SECTION_SPACING
  }

  return currentY
}

function drawExecutiveSummary(doc: jsPDF, y: number, fields: Field[], meta: LayoutMeta) {
  let currentY = ensureSpace(doc, y, 116, meta)

  drawSectionTitle(doc, "Resumo Executivo", currentY)
  currentY += SECTION_HEADER_GAP
  currentY = drawFieldRow(doc, currentY, fields.slice(0, 3), meta, [52, 52, 52])

  if (fields.length > 3) {
    currentY = drawFieldRow(doc, currentY, fields.slice(3), meta)
  }

  return currentY + 8
}

function drawLoteSection(doc: jsPDF, y: number, lote: DadosLoteNormalizados, meta: LayoutMeta) {
  let currentY = ensureSpace(doc, y, 96, meta)

  drawSectionTitle(doc, "Dados do Lote", currentY)
  currentY += SECTION_HEADER_GAP
  currentY = drawFieldRow(
    doc,
    currentY,
    [
      { label: "Data", value: lote.data },
      { label: "Quadra", value: lote.quadra },
      { label: "Lote", value: lote.lote },
      { label: "Valor Total", value: lote.valor },
    ],
    meta,
    [50, 50, 50, 50]
  )

  return currentY + 8
}

function drawClienteSection(
  doc: jsPDF,
  y: number,
  identificacao: IdentificacaoNormalizada,
  meta: LayoutMeta
) {
  let currentY = ensureSpace(doc, y, 192, meta)

  drawSectionTitle(doc, "Identificação do Cliente", currentY)
  currentY += SECTION_HEADER_GAP
  currentY = drawFieldRow(
    doc,
    currentY,
    [
      { label: "Nome", value: identificacao.cliente.clienteNome },
      { label: "CPF", value: identificacao.cliente.clienteCpf || "-" },
    ],
    meta
  )
  currentY = drawFieldRow(
    doc,
    currentY,
    [
      { label: "Telefone", value: identificacao.cliente.clienteTelefone || "-" },
      { label: "E-mail", value: identificacao.cliente.clienteEmail || "-" },
    ],
    meta
  )
  currentY = drawFieldRow(
    doc,
    currentY,
    [
      { label: "Profissão", value: identificacao.cliente.clienteProfissao || "-" },
      { label: "Estado Civil", value: identificacao.cliente.clienteEstadoCivil || "-" },
    ],
    meta
  )

  return currentY + 8
}

function drawCorretorSection(
  doc: jsPDF,
  y: number,
  identificacao: IdentificacaoNormalizada,
  meta: LayoutMeta
) {
  let currentY = ensureSpace(doc, y, 96, meta)

  drawSectionTitle(doc, "Identificação do Corretor", currentY)
  currentY += SECTION_HEADER_GAP
  currentY = drawFieldRow(
    doc,
    currentY,
    [
      { label: "Nome do Corretor", value: identificacao.corretor.nome },
      { label: "CRECI", value: identificacao.corretor.creci },
      { label: "Imobiliária", value: identificacao.corretor.imobiliaria },
    ],
    meta
  )

  return currentY + 8
}

function drawCondicaoPropostaSection(
  doc: jsPDF,
  y: number,
  condicao: CondicaoPropostaNormalizada,
  meta: LayoutMeta
) {
  let currentY = ensureSpace(doc, y, 220, meta)

  drawSectionTitle(doc, "Condição Financeira", currentY)
  currentY += SECTION_HEADER_GAP
  currentY = drawFieldRow(doc, currentY, condicao.entrada, meta, [54, 54, 54, 54])
  currentY = drawFieldRow(doc, currentY, condicao.mensais, meta)
  currentY = drawFieldRow(doc, currentY, condicao.balao, meta, [54, 54, 54, 54])

  return currentY + 8
}

function drawCondicaoContrapropostaSection(
  doc: jsPDF,
  y: number,
  condicao: CondicaoContrapropostaNormalizada,
  meta: LayoutMeta
) {
  let currentY = ensureSpace(doc, y, 194, meta)

  drawSectionTitle(doc, "Condição Financeira", currentY)
  currentY += SECTION_HEADER_GAP
  currentY = drawFieldRow(doc, currentY, condicao.aprovacao, meta)
  currentY = drawFieldRow(doc, currentY, condicao.mensais, meta)
  currentY = drawFieldRow(doc, currentY, condicao.balao, meta)

  return currentY + 8
}

function drawPermutaSection(
  doc: jsPDF,
  y: number,
  permuta: PermutaNormalizada,
  meta: LayoutMeta
) {
  if (!permuta) {
    return y
  }

  let currentY = ensureSpace(doc, y, 118, meta)

  drawSectionTitle(doc, "Permuta", currentY)
  currentY += SECTION_HEADER_GAP
  currentY = drawFieldRow(
    doc,
    currentY,
    [
      { label: "Valor da Permuta", value: permuta.valor },
      { label: "Descrição da Permuta", value: permuta.descricao },
    ],
    meta,
    [54, 72]
  )

  return currentY + 8
}

function drawNumberSummary(doc: jsPDF, y: number, fields: Field[], meta: LayoutMeta) {
  let currentY = ensureSpace(doc, y, 110, meta)

  drawSectionTitle(doc, "Principais Números", currentY)
  currentY += SECTION_HEADER_GAP
  currentY = drawFieldRow(doc, currentY, fields, meta)
  return currentY + 8
}

function drawSignatureSection(doc: jsPDF, y: number, meta: LayoutMeta) {
  let currentY = ensureSpace(doc, y + 8, SIGNATURE_SECTION_HEIGHT, meta)

  drawSectionTitle(doc, "Assinaturas", currentY)
  currentY += 48

  const lineY = currentY + 28
  const assinaturaWidth = 146
  const gap = 36
  const startX = CONTENT_LEFT

  ;[
    { label: "Cliente / Proponente", x: startX },
    { label: "Corretor", x: startX + assinaturaWidth + gap },
    { label: "BOMM Urbanizadora", x: startX + (assinaturaWidth + gap) * 2 },
  ].forEach((assinatura) => {
    setColor(doc, "draw", COLORS.grayMid)
    doc.line(assinatura.x, lineY, assinatura.x + assinaturaWidth, lineY)
    doc.setFont("helvetica", "bold")
    doc.setFontSize(8.5)
    setColor(doc, "text", COLORS.grayDark)
    doc.text(assinatura.label, assinatura.x + assinaturaWidth / 2, lineY + 14, {
      align: "center",
    })
  })

  return currentY + 48
}

function drawProposalLayout(doc: jsPDF, dados: PropostaNormalizada) {
  let y = PAGE_START_Y

  y = drawExecutiveSummary(
    doc,
    y,
    [
      { label: "Valor Total", value: dados.lote.valor },
      { label: "Entrada", value: dados.condicao.entrada[0]?.value || "-" },
      { label: "Mensais", value: dados.condicao.mensais[1]?.value || "-" },
      { label: "Balão", value: dados.condicao.balao[2]?.value || "-" },
    ],
    dados.meta
  )
  y = drawLoteSection(doc, y, dados.lote, dados.meta)
  y = drawClienteSection(doc, y, dados.identificacao, dados.meta)
  y = drawCorretorSection(doc, y, dados.identificacao, dados.meta)

  y = startNewPage(doc, dados.meta)
  y = drawCondicaoPropostaSection(doc, y, dados.condicao, dados.meta)
  y = drawPermutaSection(doc, y, dados.permuta, dados.meta)
  y = drawNumberSummary(
    doc,
    y,
    [
      { label: "Entrada Total", value: dados.condicao.entrada[0]?.value || "-" },
      { label: "Mensais", value: dados.condicao.mensais[1]?.value || "-" },
      { label: "Balão", value: dados.condicao.balao[2]?.value || "-" },
    ],
    dados.meta
  )

  y = startNewPage(doc, dados.meta)
  y = drawTextSection(doc, y, "Detalhes da Negociação", dados.detalhesNegociacao, dados.meta)
  y = drawTextSection(doc, y, "Observação", dados.observacao, dados.meta)
  drawSignatureSection(doc, y, dados.meta)
}

function drawContrapropostaLayout(doc: jsPDF, dados: ContrapropostaNormalizada) {
  let y = PAGE_START_Y

  y = drawExecutiveSummary(
    doc,
    y,
    [
      { label: "Valor do Negócio", value: dados.lote.valor },
      { label: "Valor Aprovado", value: dados.condicao.aprovacao[0]?.value || "-" },
      { label: "Entrada", value: dados.condicao.aprovacao[1]?.value || "-" },
      { label: "Validade", value: dados.condicao.mensais[2]?.value || "-" },
    ],
    dados.meta
  )
  y = drawLoteSection(doc, y, dados.lote, dados.meta)
  y = drawClienteSection(doc, y, dados.identificacao, dados.meta)
  y = drawCorretorSection(doc, y, dados.identificacao, dados.meta)

  y = startNewPage(doc, dados.meta)
  y = drawCondicaoContrapropostaSection(doc, y, dados.condicao, dados.meta)
  y = drawPermutaSection(doc, y, dados.permuta, dados.meta)
  y = drawNumberSummary(
    doc,
    y,
    [
      { label: "Valor Aprovado", value: dados.condicao.aprovacao[0]?.value || "-" },
      { label: "Mensais", value: dados.condicao.mensais[1]?.value || "-" },
      { label: "Balão", value: dados.condicao.balao[2]?.value || "-" },
    ],
    dados.meta
  )

  y = startNewPage(doc, dados.meta)
  y = drawTextSection(doc, y, "Detalhes da Negociação", dados.detalhesNegociacao, dados.meta)
  y = drawTextSection(doc, y, "Observação", dados.observacao, dados.meta)
  drawSignatureSection(doc, y, dados.meta)
}

export function gerarPdfProposta(dados: PdfPropostaPayload) {
  const normalizado = normalizePropostaData(dados)
  const doc = createDocument(normalizado.meta)

  drawProposalLayout(doc, normalizado)
  doc.save("proposta-vivendas.pdf")
}

export function gerarPdfContraproposta(dados: PdfContrapropostaPayload) {
  const normalizado = normalizeContrapropostaData(dados)
  const doc = createDocument(normalizado.meta)

  drawContrapropostaLayout(doc, normalizado)
  doc.save("contraproposta-vivendas.pdf")
}
