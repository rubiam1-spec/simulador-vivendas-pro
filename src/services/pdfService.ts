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
const HEADER_HEIGHT = 74
const PAGE_START_Y = 142
const CONTENT_LEFT = 42
const CONTENT_WIDTH = 511
const CONTENT_BOTTOM = 780
const FOOTER_Y = 812
const SECTION_TITLE_HEIGHT = 20
const SECTION_BODY_GAP = 10
const SECTION_HEADER_GAP = 30
const FIELD_GAP = 11
const DEFAULT_FIELD_MIN_HEIGHT = 42
const TEXT_PADDING_X = 10
const TEXT_PADDING_TOP = 22
const TEXT_LINE_HEIGHT = 14
const TEXT_SECTION_MIN_BOX_HEIGHT = 58
const SECTION_SPACING = 14

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

function sanitizeDetails(
  detalhes?: string | string[],
  observacao?: string
) {
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

function createDocument(meta: LayoutMeta) {
  const doc = new jsPDF({
    unit: "pt",
    format: "a4",
  })

  renderPageFrame(doc, meta)
  return doc
}

function renderPageFrame(doc: jsPDF, meta: LayoutMeta) {
  doc.setFillColor(22, 49, 39)
  doc.rect(0, 0, PAGE_WIDTH, HEADER_HEIGHT, "F")

  try {
    doc.addImage(logoVivendas, "PNG", 42, 18, 110, 34)
    doc.addImage(logoBomm, "PNG", 478, 20, 72, 28)
  } catch {
    doc.setTextColor(255, 255, 255)
    doc.setFont("helvetica", "bold")
    doc.setFontSize(18)
    doc.text("Vivendas do Bosque", 42, 38)
    doc.text("BOMM", 500, 38)
  }

  doc.setTextColor(22, 49, 39)
  doc.setFont("helvetica", "bold")
  doc.setFontSize(18)
  doc.text(meta.titulo, 42, 98)

  doc.setFont("helvetica", "normal")
  doc.setFontSize(10)
  doc.setTextColor(90, 107, 99)
  doc.text(`Data do documento: ${safeText(meta.data)}`, 42, 116)

  doc.setDrawColor(206, 214, 210)
  doc.line(42, 126, 553, 126)

  doc.setFont("helvetica", "normal")
  doc.setFontSize(8)
  doc.setTextColor(112, 124, 118)
  doc.text(
    "Parcelas corrigidas por INCC até a entrega e, após a entrega, por IPCA.",
    42,
    FOOTER_Y
  )
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
  doc.setFillColor(240, 244, 242)
  doc.roundedRect(CONTENT_LEFT, y, CONTENT_WIDTH, SECTION_TITLE_HEIGHT, 6, 6, "F")
  doc.setTextColor(22, 49, 39)
  doc.setFont("helvetica", "bold")
  doc.setFontSize(10)
  doc.text(title.toUpperCase(), CONTENT_LEFT + 12, y + 13)
}

function getRowMetrics(
  doc: jsPDF,
  fields: Field[],
  forcedHeights?: number[]
) {
  const totalGap = FIELD_GAP * (fields.length - 1)
  const fieldWidth = (CONTENT_WIDTH - totalGap) / fields.length
  const heights =
    forcedHeights ||
    fields.map((field) => {
      const linhas = doc.splitTextToSize(safeText(field.value), fieldWidth - TEXT_PADDING_X * 2) as string[]
      return Math.max(DEFAULT_FIELD_MIN_HEIGHT, 28 + linhas.length * 12)
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
  doc.setDrawColor(198, 206, 202)
  doc.setFillColor(255, 255, 255)
  doc.roundedRect(x, y, width, height, 5, 5, "FD")

  doc.setFont("helvetica", "bold")
  doc.setFontSize(8)
  doc.setTextColor(99, 114, 107)
  doc.text(field.label.toUpperCase(), x + TEXT_PADDING_X, y + 12)

  doc.setFont("helvetica", "normal")
  doc.setFontSize(10)
  doc.setTextColor(35, 43, 39)

  const linhas = doc.splitTextToSize(
    safeText(field.value),
    width - TEXT_PADDING_X * 2
  ) as string[]

  doc.text(linhas, x + TEXT_PADDING_X, y + 27)
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
    const maxLines = Math.max(
      1,
      Math.floor((availableBoxHeight - 24) / TEXT_LINE_HEIGHT)
    )
    const chunkSize = Math.min(linhas.length - indice, maxLines)
    const chunk = linhas.slice(indice, indice + chunkSize)
    const boxHeight = Math.max(TEXT_SECTION_MIN_BOX_HEIGHT, 24 + chunk.length * TEXT_LINE_HEIGHT)

    drawSectionTitle(doc, title, currentY)
    currentY += SECTION_HEADER_GAP

    doc.setDrawColor(198, 206, 202)
    doc.setFillColor(255, 255, 255)
    doc.roundedRect(CONTENT_LEFT, currentY, CONTENT_WIDTH, boxHeight, 5, 5, "FD")

    doc.setFont("helvetica", "normal")
    doc.setFontSize(10)
    doc.setTextColor(35, 43, 39)
    doc.text(chunk, CONTENT_LEFT + TEXT_PADDING_X, currentY + TEXT_PADDING_TOP)

    indice += chunk.length
    currentY += boxHeight + SECTION_SPACING
  }

  return currentY
}

function drawLoteSection(doc: jsPDF, y: number, lote: DadosLoteNormalizados, meta: LayoutMeta) {
  let currentY = ensureSpace(doc, y, 88, meta)

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
    [44, 44, 44, 44]
  )

  return currentY + 4
}

function drawClienteSection(
  doc: jsPDF,
  y: number,
  identificacao: IdentificacaoNormalizada,
  meta: LayoutMeta
) {
  let currentY = ensureSpace(doc, y, 178, meta)

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

  return currentY + 4
}

function drawCorretorSection(
  doc: jsPDF,
  y: number,
  identificacao: IdentificacaoNormalizada,
  meta: LayoutMeta
) {
  let currentY = ensureSpace(doc, y, 88, meta)

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

  return currentY + 4
}

function drawCondicaoPropostaSection(
  doc: jsPDF,
  y: number,
  condicao: CondicaoPropostaNormalizada,
  meta: LayoutMeta
) {
  let currentY = ensureSpace(doc, y, 190, meta)

  drawSectionTitle(doc, "Condição Financeira", currentY)
  currentY += SECTION_HEADER_GAP
  currentY = drawFieldRow(doc, currentY, condicao.entrada, meta, [44, 44, 44, 44])
  currentY = drawFieldRow(doc, currentY, condicao.mensais, meta)
  currentY = drawFieldRow(doc, currentY, condicao.balao, meta, [44, 44, 44, 44])

  return currentY + 4
}

function drawCondicaoContrapropostaSection(
  doc: jsPDF,
  y: number,
  condicao: CondicaoContrapropostaNormalizada,
  meta: LayoutMeta
) {
  let currentY = ensureSpace(doc, y, 160, meta)

  drawSectionTitle(doc, "Condição Financeira", currentY)
  currentY += SECTION_HEADER_GAP
  currentY = drawFieldRow(doc, currentY, condicao.aprovacao, meta)
  currentY = drawFieldRow(doc, currentY, condicao.mensais, meta)
  currentY = drawFieldRow(doc, currentY, condicao.balao, meta)

  return currentY + 4
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

  let currentY = ensureSpace(doc, y, 106, meta)

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
    [44, 60]
  )

  return currentY + 4
}

function drawProposalLayout(doc: jsPDF, dados: PropostaNormalizada) {
  let y = PAGE_START_Y

  y = drawLoteSection(doc, y, dados.lote, dados.meta)
  y = drawClienteSection(doc, y, dados.identificacao, dados.meta)
  y = drawCorretorSection(doc, y, dados.identificacao, dados.meta)
  y = drawCondicaoPropostaSection(doc, y, dados.condicao, dados.meta)
  y = drawPermutaSection(doc, y, dados.permuta, dados.meta)
  y = drawTextSection(doc, y, "Detalhes da Negociação", dados.detalhesNegociacao, dados.meta)
  drawTextSection(doc, y, "Observação", dados.observacao, dados.meta)
}

function drawContrapropostaLayout(doc: jsPDF, dados: ContrapropostaNormalizada) {
  let y = PAGE_START_Y

  y = drawLoteSection(doc, y, dados.lote, dados.meta)
  y = drawClienteSection(doc, y, dados.identificacao, dados.meta)
  y = drawCorretorSection(doc, y, dados.identificacao, dados.meta)
  y = drawCondicaoContrapropostaSection(doc, y, dados.condicao, dados.meta)
  y = drawPermutaSection(doc, y, dados.permuta, dados.meta)
  y = drawTextSection(doc, y, "Detalhes da Negociação", dados.detalhesNegociacao, dados.meta)
  drawTextSection(doc, y, "Observação", dados.observacao, dados.meta)
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
