import type {
  EventoNegociacao,
  NegociacaoSalva,
  OrigemNegociacao,
  PrioridadeNegociacao,
  StatusNegociacao,
  TipoEventoNegociacao,
} from "../types/negociacao";

const STORAGE_KEY = "central_negociacoes_bomm";

type EventoNegociacaoInput = {
  tipo: TipoEventoNegociacao;
  descricao: string;
  metadados?: Record<string, string>;
};

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function statusValido(status: unknown): status is StatusNegociacao {
  return [
    "rascunho",
    "em_negociacao",
    "aguardando_retorno",
    "aprovada",
    "fechada",
    "perdida",
    "arquivada",
  ].includes(String(status));
}

function prioridadeValida(
  prioridade: unknown
): prioridade is PrioridadeNegociacao {
  return ["baixa", "media", "alta"].includes(String(prioridade));
}

function origemValida(origem: unknown): origem is OrigemNegociacao {
  return [
    "corretor",
    "cliente_direto",
    "feira",
    "indicacao",
    "trafego_pago",
    "interno",
    "outro",
  ].includes(String(origem));
}

function createId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `neg_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function createEventId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `evt_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function criarEvento(input: EventoNegociacaoInput): EventoNegociacao {
  return {
    id: createEventId(),
    tipo: input.tipo,
    descricao: input.descricao,
    dataHora: new Date().toISOString(),
    metadados: input.metadados,
  };
}

function anexarEventos(
  negociacao: NegociacaoSalva,
  eventos: EventoNegociacaoInput[]
): NegociacaoSalva {
  if (!eventos.length) return negociacao;

  return {
    ...negociacao,
    historico: [...eventos.map(criarEvento), ...negociacao.historico],
  };
}

function normalizarNegociacao(negociacao: NegociacaoSalva): NegociacaoSalva {
  return {
    ...negociacao,
    status: statusValido(negociacao.status) ? negociacao.status : "rascunho",
    prioridade: prioridadeValida(negociacao.prioridade)
      ? negociacao.prioridade
      : "media",
    origem: origemValida(negociacao.origem) ? negociacao.origem : "outro",
    observacaoInterna: negociacao.observacaoInterna || "",
    ultimaAcao: negociacao.ultimaAcao || "",
    historico: Array.isArray(negociacao.historico) ? negociacao.historico : [],
  };
}

function readStorage(): NegociacaoSalva[] {
  if (!canUseStorage()) return [];

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? (parsed as NegociacaoSalva[]).map(normalizarNegociacao)
      : [];
  } catch (error) {
    console.error("[negociacoesStorage] erro ao ler localStorage", error);
    return [];
  }
}

function writeStorage(negociacoes: NegociacaoSalva[]) {
  if (!canUseStorage()) return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(negociacoes));
}

function gerarEventosOperacionais(
  anterior: NegociacaoSalva,
  atualizada: NegociacaoSalva
) {
  const eventos: EventoNegociacaoInput[] = [];

  if (anterior.status !== atualizada.status) {
    eventos.push({
      tipo: "status_alterado",
      descricao: `Status alterado para ${atualizada.status}`,
    });
  }

  if (anterior.prioridade !== atualizada.prioridade) {
    eventos.push({
      tipo: "prioridade_alterada",
      descricao: `Prioridade alterada para ${atualizada.prioridade}`,
    });
  }

  if (anterior.origem !== atualizada.origem) {
    eventos.push({
      tipo: "origem_alterada",
      descricao: `Origem alterada para ${atualizada.origem}`,
    });
  }

  if (anterior.observacaoInterna !== atualizada.observacaoInterna) {
    eventos.push({
      tipo: "observacao_interna_alterada",
      descricao: "Observacao interna atualizada",
    });
  }

  if (anterior.ultimaAcao !== atualizada.ultimaAcao) {
    eventos.push({
      tipo: "ultima_acao_alterada",
      descricao: `Ultima acao alterada para ${atualizada.ultimaAcao || "vazia"}`,
    });
  }

  return eventos;
}

export function listarNegociacoesSalvas(): NegociacaoSalva[] {
  return readStorage().sort((a, b) => {
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });
}

export function buscarNegociacaoPorId(id: string): NegociacaoSalva | null {
  return listarNegociacoesSalvas().find((negociacao) => negociacao.id === id) || null;
}

export function salvarNovaNegociacao(
  negociacao: Omit<NegociacaoSalva, "id" | "createdAt" | "updatedAt">,
  eventosExtras: EventoNegociacaoInput[] = []
): NegociacaoSalva {
  const agora = new Date().toISOString();
  const completa = anexarEventos(
    normalizarNegociacao({
      ...negociacao,
      id: createId(),
      createdAt: agora,
      updatedAt: agora,
    }),
    [
      {
        tipo: "negociacao_criada",
        descricao: "Negociacao criada",
      },
      ...eventosExtras,
    ]
  );

  const negociacoes = listarNegociacoesSalvas();
  writeStorage([completa, ...negociacoes]);
  return completa;
}

export function atualizarNegociacao(
  id: string,
  dadosAtualizados: Partial<Omit<NegociacaoSalva, "id" | "createdAt">>,
  eventosExtras: EventoNegociacaoInput[] = []
): NegociacaoSalva | null {
  let atualizada: NegociacaoSalva | null = null;

  const negociacoes = listarNegociacoesSalvas().map((negociacao) => {
    if (negociacao.id !== id) return negociacao;

    const baseAtualizada = normalizarNegociacao({
      ...negociacao,
      ...dadosAtualizados,
      id: negociacao.id,
      createdAt: negociacao.createdAt,
      updatedAt: new Date().toISOString(),
      historico: negociacao.historico,
    });

    const eventos = [
      ...gerarEventosOperacionais(negociacao, baseAtualizada),
      ...eventosExtras,
    ];

    atualizada = anexarEventos(baseAtualizada, eventos);
    return atualizada;
  });

  writeStorage(negociacoes);
  return atualizada;
}

export function adicionarEventoNegociacao(
  id: string,
  evento: EventoNegociacaoInput
): NegociacaoSalva | null {
  return atualizarNegociacao(id, {}, [evento]);
}

export function excluirNegociacao(id: string) {
  const negociacoes = listarNegociacoesSalvas().filter(
    (negociacao) => negociacao.id !== id
  );
  writeStorage(negociacoes);
}

export function duplicarNegociacao(id: string): NegociacaoSalva | null {
  const original = buscarNegociacaoPorId(id);
  if (!original) return null;

  const agora = new Date().toISOString();
  const duplicada = anexarEventos(
    normalizarNegociacao({
      ...original,
      id: createId(),
      titulo: `${original.titulo} (copia)`,
      status: "rascunho",
      createdAt: agora,
      updatedAt: agora,
      ultimaAcao: "Negociacao duplicada",
      historico: original.historico,
    }),
    [
      {
        tipo: "negociacao_duplicada",
        descricao: "Negociacao duplicada",
      },
    ]
  );

  const negociacoes = listarNegociacoesSalvas();
  writeStorage([duplicada, ...negociacoes]);
  return duplicada;
}
