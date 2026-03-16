import {
  adicionarEventoNegociacao,
  atualizarNegociacao,
  buscarNegociacaoPorId,
  duplicarNegociacao,
  excluirNegociacao,
  listarNegociacoesSalvas,
  salvarNovaNegociacao,
} from "./negociacoesStorage";
import type {
  NegociacaoSalva,
  OrigemNegociacao,
  PrioridadeNegociacao,
  StatusNegociacao,
  TipoEventoNegociacao,
} from "../types/negociacao";

const PIPELINE_STATUS: StatusNegociacao[] = [
  "rascunho",
  "simulacao",
  "proposta_enviada",
  "contraproposta",
  "em_negociacao",
  "aguardando_retorno",
  "aprovada",
];

const STATUS_ANALYTICS_ORDER: StatusNegociacao[] = [
  "simulacao",
  "proposta_enviada",
  "contraproposta",
  "em_negociacao",
  "aguardando_retorno",
  "aprovada",
  "fechada",
  "perdida",
  "arquivada",
  "rascunho",
];

const ORIGEM_ANALYTICS_ORDER: OrigemNegociacao[] = [
  "corretor",
  "cliente_direto",
  "feira",
  "indicacao",
  "trafego_pago",
  "interno",
  "outro",
];

const PRIORIDADE_ANALYTICS_ORDER: PrioridadeNegociacao[] = [
  "alta",
  "media",
  "baixa",
];

type EventoInput = {
  tipo: TipoEventoNegociacao;
  descricao: string;
  metadados?: Record<string, string>;
};

export type NegociacoesMetrics = {
  total: number;
  totalSimulacoes: number;
  totalPropostasEnviadas: number;
  totalEmAndamento: number;
  totalFechadas: number;
  totalPerdidas: number;
  pipelineValor: number;
  ticketMedio: number;
  porStatus: Array<{
    status: StatusNegociacao;
    quantidade: number;
    valor: number;
  }>;
  porOrigem: Array<{
    origem: OrigemNegociacao;
    quantidade: number;
  }>;
  porPrioridade: Array<{
    prioridade: PrioridadeNegociacao;
    quantidade: number;
  }>;
  recentes: NegociacaoSalva[];
};

export async function listNegociacoes(): Promise<NegociacaoSalva[]> {
  return listarNegociacoesSalvas();
}

export async function getNegociacaoById(
  id: string
): Promise<NegociacaoSalva | null> {
  return buscarNegociacaoPorId(id);
}

export async function createNegociacao(
  input: Omit<NegociacaoSalva, "id" | "createdAt" | "updatedAt">,
  eventosExtras: EventoInput[] = []
): Promise<NegociacaoSalva> {
  return salvarNovaNegociacao(input, eventosExtras);
}

export async function updateNegociacaoById(
  id: string,
  input: Partial<Omit<NegociacaoSalva, "id" | "createdAt">>,
  eventosExtras: EventoInput[] = []
): Promise<NegociacaoSalva | null> {
  return atualizarNegociacao(id, input, eventosExtras);
}

export async function deleteNegociacaoById(id: string): Promise<void> {
  excluirNegociacao(id);
}

export async function duplicateNegociacaoById(
  id: string
): Promise<NegociacaoSalva | null> {
  return duplicarNegociacao(id);
}

export async function appendNegociacaoEvent(
  id: string,
  evento: EventoInput
): Promise<NegociacaoSalva | null> {
  return adicionarEventoNegociacao(id, evento);
}

export async function getNegociacoesMetrics(): Promise<NegociacoesMetrics> {
  const negociacoes = await listNegociacoes();
  const total = negociacoes.length;
  const totalSimulacoes = negociacoes.filter(
    (negociacao) => negociacao.status === "simulacao"
  ).length;
  const totalPropostasEnviadas = negociacoes.filter((negociacao) =>
    ["proposta_enviada", "contraproposta"].includes(negociacao.status)
  ).length;
  const totalEmAndamento = negociacoes.filter((negociacao) =>
    ["em_negociacao", "aguardando_retorno", "aprovada"].includes(
      negociacao.status
    )
  ).length;
  const totalFechadas = negociacoes.filter(
    (negociacao) => negociacao.status === "fechada"
  ).length;
  const totalPerdidas = negociacoes.filter(
    (negociacao) => negociacao.status === "perdida"
  ).length;
  const pipelineValor = negociacoes.reduce((acc, negociacao) => {
    return PIPELINE_STATUS.includes(negociacao.status)
      ? acc + negociacao.valorTotal
      : acc;
  }, 0);
  const ticketMedio = total
    ? negociacoes.reduce((acc, negociacao) => acc + negociacao.valorTotal, 0) /
      total
    : 0;

  return {
    total,
    totalSimulacoes,
    totalPropostasEnviadas,
    totalEmAndamento,
    totalFechadas,
    totalPerdidas,
    pipelineValor,
    ticketMedio,
    porStatus: STATUS_ANALYTICS_ORDER.map((status) => {
      const itens = negociacoes.filter((negociacao) => negociacao.status === status);
      return {
        status,
        quantidade: itens.length,
        valor: itens.reduce((acc, negociacao) => acc + negociacao.valorTotal, 0),
      };
    }),
    porOrigem: ORIGEM_ANALYTICS_ORDER.map((origem) => ({
      origem,
      quantidade: negociacoes.filter((negociacao) => negociacao.origem === origem)
        .length,
    })),
    porPrioridade: PRIORIDADE_ANALYTICS_ORDER.map((prioridade) => ({
      prioridade,
      quantidade: negociacoes.filter(
        (negociacao) => negociacao.prioridade === prioridade
      ).length,
    })),
    recentes: [...negociacoes]
      .sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      )
      .slice(0, 5),
  };
}
