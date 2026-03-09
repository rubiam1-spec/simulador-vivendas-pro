import jsPDF from "jspdf"

import logoBomm from "../assets/logo-bomm.png"
import logoVivendas from "../assets/logo-vivendas.png"

export type PdfPropostaPayload = {
  data: string
  quadra: string
  lote: string
  valor: string
  clienteNome: string
  clienteCpf?: string
  clienteTelefone?: string
  clienteEmail?: string
  clienteProfissao?: string
  clienteEstadoCivil?: string
  corretor: string
  creci?: string
  imobiliaria: string
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
  unidades: Array<{
    quadra: string
    lote: string
    valor: string
  }>
  pagamento: Array<{
    tipo: string
    quantidade: string
    valor: string
  }>
  detalhesNegociacao: string | string[]
}

export type PdfContrapropostaPayload = {
  data: string
  quadra: string
  lote: string
  valor: string
  clienteNome: string
  clienteCpf?: string
  clienteTelefone?: string
  clienteEmail?: string
  clienteProfissao?: string
  clienteEstadoCivil?: string
  corretor: string
  creci?: string
  imobiliaria: string
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
}

type Field = {
  label: string
  value: string
}

function addPageChrome(doc: jsPDF, title: string, data: string) {
  doc.setFillColor(22, 49, 39)
  doc.rect(0, 0, 595, 72, "F")

  try {
    doc.addImage(logoVivendas, "PNG", 42, 18, 110, 34)
    doc.addImage(logoBomm, "PNG", 478, 20, 72, 28)
  } catch {
    doc.setTextColor(255, 255, 255)
    doc.setFont("helvetica", "bold")
    doc.setFontSize(18)
    doc.text("Vivendas do Bosque", 42, 36)
    doc.text("BOMM", 500, 36)
  }

  doc.setTextColor(255, 255, 255)
  doc.setFont("helvetica", "bold")
  doc.setFontSize(18)
  doc.text(title, 42, 94)

  doc.setFont("helvetica", "normal")
  doc.setFontSize(10)
  doc.setTextColor(90, 107, 99)
  doc.text(`Data do documento: ${data || "-"}`, 42, 112)

  doc.setDrawColor(206, 214, 210)
  doc.line(42, 122, 553, 122)
}

function drawSectionTitle(doc: jsPDF, title: string, y: number) {
  doc.setFillColor(240, 244, 242)
  doc.roundedRect(42, y, 511, 20, 6, 6, "F")
  doc.setTextColor(22, 49, 39)
  doc.setFont("helvetica", "bold")
  doc.setFontSize(10)
  doc.text(title.toUpperCase(), 54, y + 13)
}

function drawFieldBox(
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  h: number,
  field: Field
) {
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

  const valueLines = doc.splitTextToSize(field.value || "-", w - 20)
  doc.text(valueLines, x + 10, y + 27)
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

function drawBigBox(
  doc: jsPDF,
  y: number,
  text: string,
  height: number
) {
  doc.setDrawColor(198, 206, 202)
  doc.setFillColor(255, 255, 255)
  doc.roundedRect(42, y, 511, height, 5, 5, "FD")

  doc.setFont("helvetica", "normal")
  doc.setFontSize(10)
  doc.setTextColor(35, 43, 39)
  doc.text(doc.splitTextToSize(text || "-", 491), 52, y + 22)
}

function drawDadosLote(doc: jsPDF, y: number, payload: { quadra: string; lote: string; valor: string }) {
  drawSectionTitle(doc, "Dados do lote", y)
  y += 30
  drawFieldRow(doc, y, [
    { label: "Quadra", value: payload.quadra || "-" },
    { label: "Lote", value: payload.lote || "-" },
    { label: "Valor", value: payload.valor || "-" },
  ])
  return y + 58
}

function drawIdentificacaoCliente(
  doc: jsPDF,
  y: number,
  payload: {
    clienteNome: string
    clienteCpf?: string
    clienteTelefone?: string
    clienteEmail?: string
    clienteProfissao?: string
    clienteEstadoCivil?: string
  }
) {
  drawSectionTitle(doc, "Identificação do Cliente", y)
  y += 30
  drawFieldRow(doc, y, [
    { label: "Nome", value: payload.clienteNome || "-" },
    { label: "CPF", value: payload.clienteCpf || "-" },
  ])
  y += 52
  drawFieldRow(doc, y, [
    { label: "Telefone", value: payload.clienteTelefone || "-" },
    { label: "Email", value: payload.clienteEmail || "-" },
  ])
  y += 52
  drawFieldRow(doc, y, [
    { label: "Profissão", value: payload.clienteProfissao || "-" },
    { label: "Estado civil", value: payload.clienteEstadoCivil || "-" },
  ])
  return y + 58
}

function drawIdentificacaoCorretor(
  doc: jsPDF,
  y: number,
  payload: { corretor: string; creci?: string; imobiliaria: string }
) {
  drawSectionTitle(doc, "Identificação do Corretor", y)
  y += 30
  drawFieldRow(doc, y, [
    { label: "Nome do corretor", value: payload.corretor || "-" },
    { label: "CRECI", value: payload.creci || "-" },
    { label: "Imobiliária", value: payload.imobiliaria || "-" },
  ])
  return y + 58
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

export function gerarPdfProposta(dados: PdfPropostaPayload) {
  const doc = new jsPDF({
    unit: "pt",
    format: "a4",
  })

  const detalhesNegociacao = Array.isArray(dados.detalhesNegociacao)
    ? dados.detalhesNegociacao.join("\n")
    : dados.detalhesNegociacao || "-"

  addPageChrome(doc, "TERMO DE PROPOSTA", dados.data)

  let y = 138
  y = drawDadosLote(doc, y, dados)
  y = drawIdentificacaoCliente(doc, y, dados)
  y = drawIdentificacaoCorretor(doc, y, dados)

  drawSectionTitle(doc, "Estrutura de pagamento", y)
  y += 30
  drawFieldRow(
    doc,
    y,
    [
      { label: "Entrada total", value: dados.entrada?.valor || "-" },
      {
        label: "Entrada: qtd. parcelas",
        value: dados.entrada?.quantidadeParcelas || "-",
      },
      {
        label: "Entrada: valor parcela",
        value: dados.entrada?.valorParcela || "-",
      },
      {
        label: "Entrada: primeiro vencimento",
        value: dados.entrada?.primeiroVencimento || "-",
      },
    ],
    [44, 44, 44, 44]
  )
  y += 54
  drawFieldRow(doc, y, [
    {
      label: "Mensais: qtd. parcelas",
      value: dados.mensais?.quantidadeParcelas || "-",
    },
    {
      label: "Mensais: valor parcela",
      value: dados.mensais?.valorParcela || "-",
    },
    {
      label: "Mensais: primeiro vencimento",
      value: dados.mensais?.primeiroVencimento || "-",
    },
  ])
  y += 52
  drawFieldRow(
    doc,
    y,
    [
      { label: "Balão: tipo", value: dados.balao?.tipo || "-" },
      {
        label: "Balão: qtd. parcelas",
        value: dados.balao?.quantidadeParcelas || "-",
      },
      {
        label: "Balão: valor parcela",
        value: dados.balao?.valorParcela || "-",
      },
      {
        label: "Balão: primeiro vencimento",
        value: dados.balao?.primeiroVencimento || "-",
      },
    ],
    [44, 44, 44, 44]
  )
  y += 60

  drawSectionTitle(doc, "Permuta", y)
  y += 30
  drawFieldRow(doc, y, [
    {
      label: "Valor da permuta",
      value: dados.permuta?.valor || "-",
    },
    {
      label: "Descrição da permuta",
      value: dados.permuta?.descricao || "-",
    },
  ], [44, 60])
  y += 74

  drawSectionTitle(doc, "Observação", y)
  y += 30
  drawBigBox(doc, y, dados.observacao || detalhesNegociacao, 90)

  addFooter(doc)
  doc.save("proposta-vivendas.pdf")
}

export function gerarPdfContraproposta(dados: PdfContrapropostaPayload) {
  const doc = new jsPDF({
    unit: "pt",
    format: "a4",
  })

  addPageChrome(doc, "TERMO DE CONTRAPROPOSTA", dados.data)

  let y = 138
  y = drawDadosLote(doc, y, dados)
  y = drawIdentificacaoCliente(doc, y, dados)
  y = drawIdentificacaoCorretor(doc, y, dados)

  drawSectionTitle(doc, "Condição Aprovada", y)
  y += 30
  drawFieldRow(doc, y, [
    { label: "Valor aprovado", value: dados.condicaoAprovada.valor || "-" },
    { label: "Entrada", value: dados.condicaoAprovada.entrada || "-" },
  ])
  y += 52
  drawFieldRow(doc, y, [
    {
      label: "Mensais: qtd. parcelas",
      value: dados.condicaoAprovada.mensaisQuantidade || "-",
    },
    {
      label: "Mensais: valor parcela",
      value: dados.condicaoAprovada.mensaisValor || "-",
    },
    {
      label: "Validade",
      value: dados.condicaoAprovada.validade || "-",
    },
  ])
  y += 52
  drawFieldRow(doc, y, [
    {
      label: "Balão: tipo",
      value: dados.condicaoAprovada.balaoTipo || "-",
    },
    {
      label: "Balão: qtd. parcelas",
      value: dados.condicaoAprovada.balaoQuantidade || "-",
    },
    {
      label: "Balão: valor parcela",
      value: dados.condicaoAprovada.balaoValor || "-",
    },
  ])
  y += 58

  drawSectionTitle(doc, "Permuta aceita", y)
  y += 30
  drawFieldRow(doc, y, [
    {
      label: "Valor da permuta",
      value: dados.permuta?.valor || "-",
    },
    {
      label: "Descrição da permuta",
      value: dados.permuta?.descricao || "-",
    },
  ], [44, 60])
  y += 74

  drawSectionTitle(doc, "Observação", y)
  y += 30
  drawBigBox(doc, y, dados.observacao || "-", 90)

  addFooter(doc)
  doc.save("contraproposta-vivendas.pdf")
}
