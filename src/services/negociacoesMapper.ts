import {
  gerarPdfContraproposta,
  gerarPdfProposta,
  gerarPdfSimulacao,
} from "./pdfService";
import type { Lote } from "./planilhaService";
import type {
  AtivoNegociadoSalvo,
  CondicaoPagamentoSalva,
  ContrapropostaSalva,
  EtapaNegociacao,
  NegociacaoSalva,
  OrigemNegociacao,
  PrioridadeNegociacao,
  PropostaSalva,
  StatusNegociacao,
  TipoBalaoSalvo,
  TipoNegociacao,
  UnidadeNegociacao,
} from "../types/negociacao";

type CriarNegociacaoInput = {
  tipo: TipoNegociacao;
  clienteId: string | null;
  cliente: string;
  clienteCpf: string;
  clienteTelefone: string;
  clienteEmail: string;
  clienteProfissao: string;
  clienteEstadoCivil: string;
  corretorId: string | null;
  corretor: string;
  creci: string;
  imobiliaria: string;
  lotesSelecionados: Lote[];
  valorTotal: number;
  simulacao: NegociacaoSalva["simulacao"];
  proposta: PropostaSalva;
  contraproposta: ContrapropostaSalva;
};

type PrepararNegociacaoCrmInput = {
  base: Omit<NegociacaoSalva, "id" | "createdAt" | "updatedAt">;
  tipo: TipoNegociacao;
  negociacaoAtual?: NegociacaoSalva | null;
  ultimaAcao: string;
};

export type NegociacaoReidratada = {
  tipo: TipoNegociacao;
  clienteId: string | null;
  cliente: string;
  clienteCpf: string;
  clienteTelefone: string;
  clienteEmail: string;
  clienteProfissao: string;
  clienteEstadoCivil: string;
  corretorId: string | null;
  corretor: string;
  creci: string;
  imobiliaria: string;
  lotesSelecionados: Lote[];
  simulacao: NegociacaoSalva["simulacao"];
  proposta: PropostaSalva;
  contraproposta: ContrapropostaSalva;
};

function brl(value: number) {
  return (Number.isFinite(value) ? value : 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function numeroSeguro(value: unknown) {
  const numero = Number(value);
  return Number.isFinite(numero) ? numero : 0;
}

function chaveLote(unidade: { quadra: string; lote: string }) {
  return `${String(unidade.quadra)}::${String(unidade.lote)}`;
}

function statusPorTipo(tipo: TipoNegociacao): StatusNegociacao {
  if (tipo === "proposta") return "proposta_enviada";
  if (tipo === "contraproposta") return "contraproposta";
  return "simulacao";
}

function etapaPorTipo(tipo: TipoNegociacao): EtapaNegociacao {
  if (tipo === "proposta") return "proposta";
  if (tipo === "contraproposta") return "retorno";
  return "inicial";
}

function prioridadePadrao(): PrioridadeNegociacao {
  return "media";
}

function origemPadrao(): OrigemNegociacao {
  return "outro";
}

function ultimaAcaoPorTipo(tipo: TipoNegociacao) {
  if (tipo === "proposta") return "Proposta salva";
  if (tipo === "contraproposta") return "Contraproposta salva";
  return "Simulacao salva";
}

function normalizarCondicao(condicao: CondicaoPagamentoSalva): CondicaoPagamentoSalva {
  const temBalao = Boolean(condicao.temBalao);
  const baloesSemestrais = temBalao
    ? Math.max(1, Math.round(numeroSeguro(condicao.baloesSemestrais)))
    : 0;

  return {
    ...condicao,
    temBalao,
    entradaValor: numeroSeguro(condicao.entradaValor),
    parcelasMeses: Math.max(1, Math.round(numeroSeguro(condicao.parcelasMeses))),
    baloesSemestrais,
    percentualParcelas: temBalao
      ? Math.max(0, numeroSeguro(condicao.percentualParcelas))
      : 100,
    percentualBaloes: temBalao
      ? Math.max(0, numeroSeguro(condicao.percentualBaloes))
      : 0,
    saldoFinalPercentual: Math.max(
      0,
      Math.min(100, numeroSeguro(condicao.saldoFinalPercentual))
    ),
    saldoFinalValor: Math.max(0, numeroSeguro(condicao.saldoFinalValor)),
  };
}

function calcularEntrada(valorBase: number, condicao: CondicaoPagamentoSalva) {
  if (condicao.entradaTipo === "valor") {
    return Math.max(0, numeroSeguro(condicao.entradaValor));
  }

  return Math.max(0, valorBase * (numeroSeguro(condicao.entradaValor) / 100));
}

function calcularResumoFinanceiro(
  valorBase: number,
  condicao: CondicaoPagamentoSalva,
  valorPermuta: number,
  valorVeiculo: number
) {
  const normalizada = normalizarCondicao(condicao);
  const entrada = calcularEntrada(valorBase, normalizada);
  const saldoAposEntrada = Math.max(valorBase - entrada, 0);
  const valorSaldoFinal = normalizada.temSaldoFinal
    ? normalizada.saldoFinalTipo === "valor"
      ? Math.min(normalizada.saldoFinalValor, saldoAposEntrada)
      : Math.min(
          saldoAposEntrada * (normalizada.saldoFinalPercentual / 100),
          saldoAposEntrada
        )
    : 0;
  const saldoAposSaldoFinal = Math.max(saldoAposEntrada - valorSaldoFinal, 0);
  const baseParcelasEBaloes = Math.max(
    saldoAposSaldoFinal - valorPermuta - valorVeiculo,
    0
  );
  const baseParcelas = normalizada.temBalao
    ? baseParcelasEBaloes * (normalizada.percentualParcelas / 100)
    : baseParcelasEBaloes;
  const baseBaloes = normalizada.temBalao
    ? baseParcelasEBaloes * (normalizada.percentualBaloes / 100)
    : 0;

  return {
    entrada,
    valorSaldoFinal,
    saldoFinal: baseParcelasEBaloes,
    baseParcelasEBaloes,
    valorParcela:
      normalizada.parcelasMeses > 0
        ? baseParcelas / normalizada.parcelasMeses
        : 0,
    valorBalao:
      normalizada.temBalao && normalizada.baloesSemestrais > 0
        ? baseBaloes / normalizada.baloesSemestrais
        : 0,
  };
}

function descreverFluxoBalao(
  condicao: CondicaoPagamentoSalva,
  valorBalao: number,
  tipoBalao: TipoBalaoSalvo = "semestral"
) {
  const normalizada = normalizarCondicao(condicao);
  if (!normalizada.temBalao || valorBalao <= 0) {
    return "- Fluxo sem balao";
  }

  return `- ${normalizada.baloesSemestrais} baloes ${
    tipoBalao === "anual" ? "anuais" : "semestrais"
  } de ${brl(valorBalao)}`;
}

function mapearUnidades(lotesSelecionados: Lote[]): UnidadeNegociacao[] {
  return lotesSelecionados.map((lote) => ({
    chave: chaveLote(lote),
    quadra: String(lote.quadra),
    lote: String(lote.lote),
    valor: numeroSeguro(lote.valor),
    status: lote.status || "",
  }));
}

function clonar<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function criarPayloadSimulacao(
  input: CriarNegociacaoInput,
  unidades: UnidadeNegociacao[]
) {
  return {
    modoDocumento: input.tipo,
    cliente: {
      id: input.clienteId,
      nome: input.cliente,
      cpf: input.clienteCpf,
      telefone: input.clienteTelefone,
      email: input.clienteEmail,
      profissao: input.clienteProfissao,
      estadoCivil: input.clienteEstadoCivil,
    },
    corretor: {
      id: input.corretorId,
      nome: input.corretor,
      creci: input.creci,
      imobiliaria: input.imobiliaria,
    },
    lotes: clonar(unidades),
    simulacao: clonar(input.simulacao),
    proposta: clonar(input.proposta),
    contraproposta: clonar(input.contraproposta),
  } as NegociacaoSalva["payloadSimulacao"];
}

export function mapearSimuladorParaNegociacaoSalva(
  input: CriarNegociacaoInput
): Omit<NegociacaoSalva, "id" | "createdAt" | "updatedAt"> {
  const unidades = mapearUnidades(input.lotesSelecionados);
  const resumoLotes = unidades.length
    ? unidades.map((unidade) => `Q${unidade.quadra} • L${unidade.lote}`).join(", ")
    : "Nenhuma unidade selecionada";
  const simulacao = clonar(input.simulacao);
  const proposta = clonar(input.proposta);
  const contraproposta = clonar(input.contraproposta);
  const entrada =
    proposta.condicao.entradaTipo === "valor"
      ? numeroSeguro(proposta.condicao.entradaValor)
      : Math.max(
          0,
          numeroSeguro(input.valorTotal) *
            (numeroSeguro(proposta.condicao.entradaValor) / 100)
        );
  const saldoFinal =
    proposta.condicao.temSaldoFinal && proposta.condicao.saldoFinalTipo === "valor"
      ? numeroSeguro(proposta.condicao.saldoFinalValor)
      : simulacao.temSaldoFinal && simulacao.saldoFinalTipo === "valor"
        ? numeroSeguro(simulacao.saldoFinalValor)
        : 0;
  const permuta: AtivoNegociadoSalvo | null =
    input.tipo === "contraproposta"
      ? contraproposta.permutaAceita
      : input.tipo === "proposta"
        ? proposta.permuta
        : simulacao.permuta;
  const veiculo: AtivoNegociadoSalvo | null =
    input.tipo === "contraproposta"
      ? contraproposta.veiculoAceito
      : input.tipo === "proposta"
        ? proposta.veiculo
        : simulacao.veiculo;

  return {
    tipo: input.tipo,
    status: statusPorTipo(input.tipo),
    etapa: etapaPorTipo(input.tipo),
    prioridade: prioridadePadrao(),
    origem: origemPadrao(),
    observacaoInterna: "",
    observacoes:
      input.tipo === "contraproposta"
        ? contraproposta.observacoes
        : proposta.observacoes,
    ultimaAcao: ultimaAcaoPorTipo(input.tipo),
    titulo: `${input.tipo.toUpperCase()} • ${input.cliente || "Sem cliente"}`,
    clienteId: input.clienteId,
    clienteNome: input.cliente,
    cliente: input.cliente,
    clienteCpf: input.clienteCpf,
    clienteTelefone: input.clienteTelefone,
    clienteEmail: input.clienteEmail,
    clienteProfissao: input.clienteProfissao,
    clienteEstadoCivil: input.clienteEstadoCivil,
    corretorId: input.corretorId,
    corretorNome: input.corretor,
    corretor: input.corretor,
    creci: input.creci,
    imobiliaria: input.imobiliaria,
    consultoraId: null,
    consultoraNome: "",
    unidades,
    valorTotal: numeroSeguro(input.valorTotal),
    entrada,
    saldoFinal,
    permuta: clonar(permuta),
    veiculo: clonar(veiculo),
    resumoLotes,
    payloadSimulacao: criarPayloadSimulacao(input, unidades),
    historico: [],
    simulacao,
    proposta,
    contraproposta,
  };
}

export function prepararNegociacaoParaCrm({
  base,
  tipo,
  negociacaoAtual,
  ultimaAcao,
}: PrepararNegociacaoCrmInput): Omit<
  NegociacaoSalva,
  "id" | "createdAt" | "updatedAt"
> {
  if (!negociacaoAtual) {
    return {
      ...base,
      tipo,
      status: statusPorTipo(tipo),
      etapa: etapaPorTipo(tipo),
      ultimaAcao,
      titulo: `${tipo.toUpperCase()} • ${base.cliente || "Sem cliente"}`,
    };
  }

  return {
    ...base,
    tipo,
    status: negociacaoAtual.status,
    etapa: negociacaoAtual.etapa,
    prioridade: negociacaoAtual.prioridade,
    origem: negociacaoAtual.origem,
    observacaoInterna: negociacaoAtual.observacaoInterna,
    observacoes: base.observacoes || negociacaoAtual.observacoes,
    ultimaAcao,
    titulo: `${tipo.toUpperCase()} • ${base.cliente || "Sem cliente"}`,
  };
}

export function reidratarNegociacaoSalva(
  negociacao: NegociacaoSalva
): NegociacaoReidratada {
  return {
    tipo: negociacao.tipo,
    clienteId: negociacao.clienteId || null,
    cliente: negociacao.cliente,
    clienteCpf: negociacao.clienteCpf,
    clienteTelefone: negociacao.clienteTelefone,
    clienteEmail: negociacao.clienteEmail,
    clienteProfissao: negociacao.clienteProfissao,
    clienteEstadoCivil: negociacao.clienteEstadoCivil,
    corretorId: negociacao.corretorId || null,
    corretor: negociacao.corretor,
    creci: negociacao.creci,
    imobiliaria: negociacao.imobiliaria,
    lotesSelecionados: negociacao.unidades.map((unidade) => ({
      quadra: unidade.quadra,
      lote: unidade.lote,
      valor: unidade.valor,
      status: unidade.status,
    })),
    simulacao: clonar(negociacao.simulacao),
    proposta: clonar(negociacao.proposta),
    contraproposta: clonar(negociacao.contraproposta),
  };
}

function gerarResumoSimulacao(negociacao: NegociacaoSalva) {
  const simulacao = negociacao.simulacao;
  const valorPermuta = simulacao.temPermuta ? numeroSeguro(simulacao.permuta?.valor) : 0;
  const valorVeiculo = simulacao.temVeiculo ? numeroSeguro(simulacao.veiculo?.valor) : 0;
  const calculo = calcularResumoFinanceiro(
    negociacao.valorTotal,
    {
      entradaTipo: "percentual",
      entradaValor: simulacao.entradaPercentual,
      temBalao: simulacao.temBalao,
      parcelasMeses: simulacao.parcelasMeses,
      baloesSemestrais: simulacao.baloesSemestrais,
      percentualParcelas: 30,
      percentualBaloes: 70,
      temSaldoFinal: simulacao.temSaldoFinal,
      saldoFinalTipo: simulacao.saldoFinalTipo,
      saldoFinalPercentual: simulacao.saldoFinalPercentual,
      saldoFinalValor: simulacao.saldoFinalValor,
      saldoFinalVencimento: simulacao.saldoFinalVencimento,
      saldoFinalForma: simulacao.saldoFinalForma,
    },
    valorPermuta,
    valorVeiculo
  );

  return {
    calculo,
    detalhesNegociacao: [
      `- Valor total dos terrenos: ${brl(negociacao.valorTotal)}`,
      `- Entrada (${simulacao.entradaPercentual}%): ${brl(calculo.entrada)}`,
      ...(simulacao.temSaldoFinal && calculo.valorSaldoFinal > 0
        ? [
            `- Saldo final na entrega: ${brl(calculo.valorSaldoFinal)}`,
            `- Vencimento previsto: ${simulacao.saldoFinalVencimento || "2027-09-30"}`,
            `- Forma prevista: ${
              simulacao.saldoFinalForma === "quitacao"
                ? "quitacao"
                : simulacao.saldoFinalForma === "financiamento"
                  ? "financiamento"
                  : "a definir"
            }`,
          ]
        : []),
      ...(valorPermuta > 0
        ? [
            `- Permuta: ${
              simulacao.permuta?.descricao || "Permuta informada"
            } - ${brl(valorPermuta)}`,
          ]
        : []),
      ...(valorVeiculo > 0
        ? [
            `- Veiculo: ${
              simulacao.veiculo?.descricao || "Veiculo informado"
            } - ${brl(valorVeiculo)}`,
          ]
        : []),
      `- Base para mensais e baloes: ${brl(calculo.baseParcelasEBaloes)}`,
      `- ${simulacao.parcelasMeses} parcelas mensais de ${brl(calculo.valorParcela)}`,
      descreverFluxoBalao(
        {
          entradaTipo: "percentual",
          entradaValor: simulacao.entradaPercentual,
          temBalao: simulacao.temBalao,
          parcelasMeses: simulacao.parcelasMeses,
          baloesSemestrais: simulacao.baloesSemestrais,
          percentualParcelas: 30,
          percentualBaloes: 70,
          temSaldoFinal: simulacao.temSaldoFinal,
          saldoFinalTipo: simulacao.saldoFinalTipo,
          saldoFinalPercentual: simulacao.saldoFinalPercentual,
          saldoFinalValor: simulacao.saldoFinalValor,
          saldoFinalVencimento: simulacao.saldoFinalVencimento,
          saldoFinalForma: simulacao.saldoFinalForma,
        },
        calculo.valorBalao
      ),
    ],
  };
}

export function gerarPdfDaNegociacaoSalva(negociacao: NegociacaoSalva) {
  const unidades = negociacao.unidades.map((unidade) => ({
    quadra: unidade.quadra,
    lote: unidade.lote,
    valor: brl(unidade.valor),
  }));
  const quadras = Array.from(
    new Set(negociacao.unidades.map((unidade) => unidade.quadra))
  ).join(", ");
  const lotes = negociacao.unidades.map((unidade) => unidade.lote).join(", ");

  if (negociacao.tipo === "simulacao") {
    const { calculo, detalhesNegociacao } = gerarResumoSimulacao(negociacao);

    gerarPdfSimulacao({
      data: new Date(negociacao.updatedAt).toISOString().slice(0, 10),
      quadra: quadras || "-",
      lote: lotes || "-",
      valor: brl(negociacao.valorTotal),
      clienteNome: negociacao.cliente || "-",
      clienteCpf: negociacao.clienteCpf || "-",
      clienteTelefone: negociacao.clienteTelefone || "-",
      clienteEmail: negociacao.clienteEmail || "-",
      clienteProfissao: negociacao.clienteProfissao || "-",
      clienteEstadoCivil: negociacao.clienteEstadoCivil || "-",
      corretor: negociacao.corretor || "-",
      creci: negociacao.creci || "-",
      imobiliaria: negociacao.imobiliaria || "-",
      unidades,
      entrada: brl(calculo.entrada),
      saldoFinal:
        negociacao.simulacao.temSaldoFinal && calculo.valorSaldoFinal > 0
          ? {
              valor: brl(calculo.valorSaldoFinal),
              vencimento: negociacao.simulacao.saldoFinalVencimento || "2027-09-30",
              forma:
                negociacao.simulacao.saldoFinalForma === "quitacao"
                  ? "quitacao"
                  : negociacao.simulacao.saldoFinalForma === "financiamento"
                    ? "financiamento"
                    : "a definir",
            }
          : undefined,
      permuta:
        negociacao.simulacao.temPermuta && negociacao.simulacao.permuta
          ? {
              valor: brl(negociacao.simulacao.permuta.valor),
              descricao: negociacao.simulacao.permuta.descricao || "-",
            }
          : undefined,
      veiculo:
        negociacao.simulacao.temVeiculo && negociacao.simulacao.veiculo
          ? {
              valor: brl(negociacao.simulacao.veiculo.valor),
              descricao: negociacao.simulacao.veiculo.descricao || "-",
            }
          : undefined,
      mensais: {
        quantidadeParcelas: `${negociacao.simulacao.parcelasMeses} parcelas`,
        valorParcela: brl(calculo.valorParcela),
      },
      balao: negociacao.simulacao.temBalao
        ? {
            tipo: "Semestral",
            quantidadeParcelas: `${negociacao.simulacao.baloesSemestrais} parcelas`,
            valorParcela: brl(calculo.valorBalao),
          }
        : undefined,
      baseParcelasEBaloes: brl(calculo.baseParcelasEBaloes),
      saldoRemanescente: brl(calculo.saldoFinal),
      detalhesNegociacao,
      observacao:
        "Condicao comercial sujeita a disponibilidade das unidades e validacao na data da negociacao.",
    });
    return;
  }

  if (negociacao.tipo === "proposta") {
    const proposta = negociacao.proposta;
    const valorPermuta = proposta.temPermuta ? numeroSeguro(proposta.permuta?.valor) : 0;
    const valorVeiculo = proposta.temVeiculo ? numeroSeguro(proposta.veiculo?.valor) : 0;
    const calculo = calcularResumoFinanceiro(
      proposta.valorOfertado,
      proposta.condicao,
      valorPermuta,
      valorVeiculo
    );

    gerarPdfProposta({
      data: proposta.data,
      quadra: quadras || "-",
      lote: lotes || "-",
      valor: brl(negociacao.valorTotal),
      clienteNome: negociacao.cliente || "-",
      clienteCpf: negociacao.clienteCpf || "-",
      clienteTelefone: negociacao.clienteTelefone || "-",
      clienteEmail: negociacao.clienteEmail || "-",
      clienteProfissao: negociacao.clienteProfissao || "-",
      clienteEstadoCivil: negociacao.clienteEstadoCivil || "-",
      corretor: negociacao.corretor || "-",
      creci: negociacao.creci || "-",
      imobiliaria: negociacao.imobiliaria || "-",
      unidades,
      entrada: {
        valor: brl(calculo.entrada),
        quantidadeParcelas: String(proposta.entradaQuantidadeParcelas || 1),
        valorParcela: brl(
          proposta.entradaQuantidadeParcelas > 0
            ? calculo.entrada / proposta.entradaQuantidadeParcelas
            : calculo.entrada
        ),
        primeiroVencimento: proposta.entradaPrimeiroVencimento || "-",
      },
      mensais: {
        quantidadeParcelas: String(proposta.condicao.parcelasMeses),
        valorParcela: brl(calculo.valorParcela),
        primeiroVencimento: proposta.mensaisPrimeiroVencimento || "-",
      },
      balao: proposta.condicao.temBalao
        ? {
            tipo: proposta.balaoTipo,
            quantidadeParcelas: String(proposta.condicao.baloesSemestrais),
            valorParcela: brl(calculo.valorBalao),
            primeiroVencimento: proposta.balaoPrimeiroVencimento || "-",
          }
        : undefined,
      permuta:
        proposta.temPermuta && proposta.permuta
          ? {
              valor: brl(proposta.permuta.valor),
              descricao: proposta.permuta.descricao || "-",
            }
          : undefined,
      observacao: proposta.observacoes || "-",
      detalhesNegociacao: [
        `- Valor ofertado: ${brl(proposta.valorOfertado)}`,
        `- ${proposta.condicao.parcelasMeses} parcelas mensais de ${brl(calculo.valorParcela)}`,
        descreverFluxoBalao(proposta.condicao, calculo.valorBalao, proposta.balaoTipo),
      ],
    });
    return;
  }

  const contraproposta = negociacao.contraproposta;
  const valorPermuta = contraproposta.temPermuta
    ? numeroSeguro(contraproposta.permutaAceita?.valor)
    : 0;
  const valorVeiculo = contraproposta.temVeiculo
    ? numeroSeguro(contraproposta.veiculoAceito?.valor)
    : 0;
  const calculo = calcularResumoFinanceiro(
    contraproposta.valorAprovado,
    contraproposta.condicao,
    valorPermuta,
    valorVeiculo
  );

  gerarPdfContraproposta({
    data: new Date(negociacao.updatedAt).toISOString().slice(0, 10),
    quadra: quadras || "-",
    lote: lotes || "-",
    valor: brl(negociacao.valorTotal),
    clienteNome: negociacao.cliente || "-",
    clienteCpf: negociacao.clienteCpf || "-",
    clienteTelefone: negociacao.clienteTelefone || "-",
    clienteEmail: negociacao.clienteEmail || "-",
    clienteProfissao: negociacao.clienteProfissao || "-",
    clienteEstadoCivil: negociacao.clienteEstadoCivil || "-",
    corretor: negociacao.corretor || "-",
    creci: negociacao.creci || "-",
    imobiliaria: negociacao.imobiliaria || "-",
    unidades,
    condicaoAprovada: {
      valor: brl(contraproposta.valorAprovado),
      entrada:
        contraproposta.condicao.entradaTipo === "percentual"
          ? `${contraproposta.condicao.entradaValor}% (${brl(calculo.entrada)})`
          : brl(calculo.entrada),
      mensaisQuantidade: `${contraproposta.condicao.parcelasMeses}x`,
      mensaisValor: brl(calculo.valorParcela),
      balaoTipo: contraproposta.condicao.temBalao ? "semestral" : undefined,
      balaoQuantidade: contraproposta.condicao.temBalao
        ? `${contraproposta.condicao.baloesSemestrais}x`
        : undefined,
      balaoValor: contraproposta.condicao.temBalao
        ? brl(calculo.valorBalao)
        : undefined,
      validade: contraproposta.validade || "-",
    },
    permuta:
      contraproposta.temPermuta && contraproposta.permutaAceita
        ? {
            valor: brl(contraproposta.permutaAceita.valor),
            descricao: contraproposta.permutaAceita.descricao || "-",
          }
        : undefined,
    observacao: contraproposta.observacoes || "-",
    detalhesNegociacao: [
      `- Valor aprovado: ${brl(contraproposta.valorAprovado)}`,
      `- ${contraproposta.condicao.parcelasMeses} parcelas mensais de ${brl(calculo.valorParcela)}`,
      descreverFluxoBalao(contraproposta.condicao, calculo.valorBalao),
    ],
  });
}
