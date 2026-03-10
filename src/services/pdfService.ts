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

function texto(valor?: string) {
  const limpo = (valor || "").trim()
  return limpo ? limpo : "-"
}

function consolidarLotes(unidades: UnidadePdf[]) {
  if (!unidades.length) {
    return {
      quadra: "-",
      lote: "-",
    }
  }

  return {
    quadra: Array.from(new Set(unidades.map((unidade) => texto(unidade.quadra)))).join(", "),
    lote: unidades.map((unidade) => texto(unidade.lote)).join(", "),
  }
}

function resolverDadosLote(payload: {
  quadra: string
  lote: string
  valor: string
  unidades?: UnidadePdf[]
}) {
  const unidades = payload.unidades || []
  const consolidado = consolidarLotes(unidades)

  return {
    quadra: texto(payload.quadra !== "-" ? payload.quadra : consolidado.quadra),
    lote: texto(payload.lote !== "-" ? payload.lote : consolidado.lote),
    valor: texto(payload.valor),
  }
}

function normalizarTextoLongo(valor?: string | string[]) {
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

  return (valor || "").trim()
}

function temConteudoTexto(valor?: string | string[]) {
  const textoLongo = normalizarTextoLongo(valor)
  return Boolean(textoLongo && textoLongo !== "-")
}

function addPageChrome(doc: jsPDF, titulo: string, data: string) {
  doc.setFillColor(22, 49, 39)
  doc.rect(0, 0, 595, 74, "F")

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
  doc.text(titulo, 42, 98)

  doc.setFont("helvetica", "normal")
  doc.setFontSize(10)
  doc.setTextColor(90, 107, 99)
  doc.text(`Data do documento: ${texto(data)}`, 42, 116)

  doc.setDrawColor(206, 214, 210)
  doc.line(42, 126, 553, 126)
}

function addFooter(doc: jsPDF) {
  doc.setFont("helvetica", "normal")
  doc.setFontSize(8)
  doc.setTextColor(112, 124, 118)
  doc.text(
    "Parcelas corrigidas por INCC até a entrega e, após a entrega, por IPCA.",
    42,
    812
  )
}

function drawSectionTitle(doc: jsPDF, title: string, y: number) {
  doc.setFillColor(240, 244, 242)
  doc.roundedRect(42, y, 511, 20, 6, 6, "F")
  doc.setTextColor(22, 49, 39)
  doc.setFont("helvetica", "bold")
  doc.setFontSize(10)
  doc.text(title.toUpperCase(), 54, y + 13)
}

function drawFieldBox(doc: jsPDF, x: number, y: number, w: number, h: number, field: Field) {
  doc.setDrawColor(198, 206, 202)
  doc.setFillColor(255, 255, 255)
  doc.roundedRect(x, y, w, h, 5, 5, "FD")

  doc.setFont("helvetica", "bold")
  doc.setFontSize(8)
  doc.setTextColor(99, 114, 107)
  doc.text(field.label.toUpperCase(), x + 10, y + 12)

  doc.setFont("helvetica", "normal")
  doc.setFontSize(10)
  doc.setTextColor(35, 43, 39)

  const linhas = doc.splitTextToSize(texto(field.value), w - 20)
  doc.text(linhas, x + 10, y + 27)
}

function drawFieldRow(
  doc: jsPDF,
  y: number,
  fields: Field[],
  heights?: number[]
) {
  const gap = 11
  const totalGap = gap * (fields.length - 1)
  const width = (511 - totalGap) / fields.length

  fields.forEach((field, index) => {
    const x = 42 + index * (width + gap)
    const h = heights?.[index] ?? 42
    drawFieldBox(doc, x, y, width, h, field)
  })
}

function drawDadosLote(
  doc: jsPDF,
  y: number,
  payload: { quadra: string; lote: string; valor: string; unidades?: UnidadePdf[] }
) {
  const dadosLote = resolverDadosLote(payload)

  drawSectionTitle(doc, "Dados do Lote", y)
  y += 30
  drawFieldRow(doc, y, [
    { label: "Quadra", value: dadosLote.quadra },
    { label: "Lote", value: dadosLote.lote },
    { label: "Valor", value: dadosLote.valor },
  ])
  return y + 58
}

function drawIdentificacaoCliente(doc: jsPDF, y: number, payload: IdentificacaoPdf) {
  drawSectionTitle(doc, "Identificação do Cliente", y)
  y += 30
  drawFieldRow(doc, y, [
    { label: "Nome", value: payload.clienteNome },
    { label: "CPF", value: payload.clienteCpf || "-" },
  ])
  y += 52
  drawFieldRow(doc, y, [
    { label: "Telefone", value: payload.clienteTelefone || "-" },
    { label: "E-mail", value: payload.clienteEmail || "-" },
  ])
  y += 52
  drawFieldRow(doc, y, [
    { label: "Profissão", value: payload.clienteProfissao || "-" },
    { label: "Estado Civil", value: payload.clienteEstadoCivil || "-" },
  ])
  return y + 58
}

function drawIdentificacaoCorretor(doc: jsPDF, y: number, payload: IdentificacaoPdf) {
  drawSectionTitle(doc, "Identificação do Corretor", y)
  y += 30
  drawFieldRow(doc, y, [
    { label: "Nome do Corretor", value: payload.corretor },
    { label: "CRECI", value: payload.creci || "-" },
    { label: "Imobiliária", value: payload.imobiliaria },
  ])
  return y + 58
}

function drawPermuta(
  doc: jsPDF,
  y: number,
  titulo: string,
  permuta?: { valor: string; descricao: string }
) {
  drawSectionTitle(doc, titulo, y)
  y += 30
  drawFieldRow(doc, y, [
    { label: "Valor da Permuta", value: permuta?.valor || "-" },
    { label: "Descrição da Permuta", value: permuta?.descricao || "-" },
  ], [44, 60])
  return y + 74
}

function ensureTextSectionSpace(
  doc: jsPDF,
  y: number,
  requiredHeight: number,
  tituloDocumento: string,
  dataDocumento: string
) {
  if (y + requiredHeight <= 780) {
    return y
  }

  doc.addPage()
  addPageChrome(doc, tituloDocumento, dataDocumento)
  return 142
}

function drawTextSection(
  doc: jsPDF,
  y: number,
  sectionTitle: string,
  content: string | string[] | undefined,
  tituloDocumento: string,
  dataDocumento: string
) {
  if (!temConteudoTexto(content)) {
    return y
  }

  const textoBloco = normalizarTextoLongo(content)
  const lineHeight = 14
  const linhas = doc.splitTextToSize(textoBloco, 491) as string[]
  const linhasPorPagina = 43
  let indice = 0

  while (indice < linhas.length) {
    const restantes = linhas.length - indice
    const quantidadeLinhas = Math.min(restantes, linhasPorPagina)
    const alturaBox = Math.max(58, 24 + quantidadeLinhas * lineHeight)
    const alturaSecao = 30 + alturaBox + 14

    y = ensureTextSectionSpace(doc, y, alturaSecao, tituloDocumento, dataDocumento)

    drawSectionTitle(doc, sectionTitle, y)
    y += 30

    doc.setDrawColor(198, 206, 202)
    doc.setFillColor(255, 255, 255)
    doc.roundedRect(42, y, 511, alturaBox, 5, 5, "FD")

    doc.setFont("helvetica", "normal")
    doc.setFontSize(10)
    doc.setTextColor(35, 43, 39)
    doc.text(linhas.slice(indice, indice + quantidadeLinhas), 52, y + 22)

    indice += quantidadeLinhas
    y += alturaBox + 14
  }

  return y
}

function createDocument(titulo: string, data: string) {
  const doc = new jsPDF({
    unit: "pt",
    format: "a4",
  })

  addPageChrome(doc, titulo, data)
  return doc
}

export function gerarPdfProposta(dados: PdfPropostaPayload) {
  const doc = createDocument("TERMO DE PROPOSTA", dados.data)
  const observacao = normalizarTextoLongo(dados.observacao)
  const detalhesNegociacao = normalizarTextoLongo(dados.detalhesNegociacao)

  let y = 142
  y = drawDadosLote(doc, y, dados)
  y = drawIdentificacaoCliente(doc, y, dados)
  y = drawIdentificacaoCorretor(doc, y, dados)

  drawSectionTitle(doc, "Estrutura de Pagamento", y)
  y += 30
  drawFieldRow(doc, y, [
    { label: "Entrada Total", value: dados.entrada?.valor || "-" },
    { label: "Entrada: Qtd. Parcelas", value: dados.entrada?.quantidadeParcelas || "-" },
    { label: "Entrada: Valor da Parcela", value: dados.entrada?.valorParcela || "-" },
    { label: "Entrada: Primeiro Vencimento", value: dados.entrada?.primeiroVencimento || "-" },
  ], [44, 44, 44, 44])
  y += 54
  drawFieldRow(doc, y, [
    { label: "Mensais: Qtd. Parcelas", value: dados.mensais?.quantidadeParcelas || "-" },
    { label: "Mensais: Valor da Parcela", value: dados.mensais?.valorParcela || "-" },
    { label: "Mensais: Primeiro Vencimento", value: dados.mensais?.primeiroVencimento || "-" },
  ])
  y += 52
  drawFieldRow(doc, y, [
    { label: "Balão: Tipo", value: dados.balao?.tipo || "-" },
    { label: "Balão: Qtd. Parcelas", value: dados.balao?.quantidadeParcelas || "-" },
    { label: "Balão: Valor da Parcela", value: dados.balao?.valorParcela || "-" },
    { label: "Balão: Primeiro Vencimento", value: dados.balao?.primeiroVencimento || "-" },
  ], [44, 44, 44, 44])
  y += 60

  y = drawPermuta(doc, y, "Permuta", dados.permuta)
  y = drawTextSection(
    doc,
    y,
    "Detalhes da Negociação",
    detalhesNegociacao,
    "TERMO DE PROPOSTA",
    dados.data
  )
  y = drawTextSection(
    doc,
    y,
    "Observação",
    observacao,
    "TERMO DE PROPOSTA",
    dados.data
  )

  addFooter(doc)
  doc.save("proposta-vivendas.pdf")
}

export function gerarPdfContraproposta(dados: PdfContrapropostaPayload) {
  const doc = createDocument("TERMO DE CONTRAPROPOSTA", dados.data)
  const observacao = normalizarTextoLongo(dados.observacao)
  const detalhesNegociacao = normalizarTextoLongo(dados.detalhesNegociacao)

  let y = 142
  y = drawDadosLote(doc, y, dados)
  y = drawIdentificacaoCliente(doc, y, dados)
  y = drawIdentificacaoCorretor(doc, y, dados)

  drawSectionTitle(doc, "Condição Aprovada", y)
  y += 30
  drawFieldRow(doc, y, [
    { label: "Valor Aprovado", value: dados.condicaoAprovada.valor },
    { label: "Entrada", value: dados.condicaoAprovada.entrada },
  ])
  y += 52
  drawFieldRow(doc, y, [
    { label: "Mensais: Qtd. Parcelas", value: dados.condicaoAprovada.mensaisQuantidade },
    { label: "Mensais: Valor da Parcela", value: dados.condicaoAprovada.mensaisValor },
    { label: "Validade", value: dados.condicaoAprovada.validade || "-" },
  ])
  y += 52
  drawFieldRow(doc, y, [
    { label: "Balão: Tipo", value: dados.condicaoAprovada.balaoTipo },
    { label: "Balão: Qtd. Parcelas", value: dados.condicaoAprovada.balaoQuantidade },
    { label: "Balão: Valor da Parcela", value: dados.condicaoAprovada.balaoValor },
  ])
  y += 58

  y = drawPermuta(doc, y, "Permuta Aceita", dados.permuta)
  y = drawTextSection(
    doc,
    y,
    "Detalhes da Negociação",
    detalhesNegociacao,
    "TERMO DE CONTRAPROPOSTA",
    dados.data
  )
  y = drawTextSection(
    doc,
    y,
    "Observação",
    observacao,
    "TERMO DE CONTRAPROPOSTA",
    dados.data
  )

  addFooter(doc)
  doc.save("contraproposta-vivendas.pdf")
}
