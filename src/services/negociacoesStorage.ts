import type {
  EtapaNegociacao,
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
    "simulacao",
    "proposta_enviada",
    "contraproposta",
    "em_negociacao",
    "aguardando_retorno",
    "aprovada",
    "fechada",
    "perdida",
    "arquivada",
  ].includes(String(status));
}

function etapaValida(etapa: unknown): etapa is EtapaNegociacao {
  return ["inicial", "atendimento", "proposta", "retorno", "fechamento"].includes(
    String(etapa)
  );
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
    status: statusValido(negociacao.status) ? negociacao.status : "simulacao",
    etapa: etapaValida(negociacao.etapa) ? negociacao.etapa : "inicial",
    prioridade: prioridadeValida(negociacao.prioridade)
      ? negociacao.prioridade
      : "media",
    origem: origemValida(negociacao.origem) ? negociacao.origem : "outro",
    observacaoInterna: negociacao.observacaoInterna || "",
    observacoes: negociacao.observacoes || "",
    ultimaAcao: negociacao.ultimaAcao || "",
    clienteId: negociacao.clienteId || null,
    clienteNome: negociacao.clienteNome || negociacao.cliente || "",
    cliente: negociacao.cliente || negociacao.clienteNome || "",
    corretorId: negociacao.corretorId || null,
    corretorNome: negociacao.corretorNome || negociacao.corretor || "",
    corretor: negociacao.corretor || negociacao.corretorNome || "",
    entrada: Number.isFinite(negociacao.entrada) ? negociacao.entrada : 0,
    saldoFinal: Number.isFinite(negociacao.saldoFinal) ? negociacao.saldoFinal : 0,
    permuta: negociacao.permuta || null,
    veiculo: negociacao.veiculo || null,
    payloadSimulacao:
      negociacao.payloadSimulacao || {
        modoDocumento: negociacao.tipo,
        cliente: {
          id: negociacao.clienteId || null,
          nome: negociacao.clienteNome || negociacao.cliente || "",
          cpf: negociacao.clienteCpf || "",
          telefone: negociacao.clienteTelefone || "",
          email: negociacao.clienteEmail || "",
          profissao: negociacao.clienteProfissao || "",
          estadoCivil: negociacao.clienteEstadoCivil || "",
        },
        corretor: {
          id: negociacao.corretorId || null,
          nome: negociacao.corretorNome || negociacao.corretor || "",
          creci: negociacao.creci || "",
          imobiliaria: negociacao.imobiliaria || "",
        },
        lotes: Array.isArray(negociacao.unidades) ? negociacao.unidades : [],
        simulacao: negociacao.simulacao,
        proposta: negociacao.proposta,
        contraproposta: negociacao.contraproposta,
      },
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

  if (anterior.etapa !== atualizada.etapa) {
    eventos.push({
      tipo: "etapa_alterada",
      descricao: `Etapa alterada para ${atualizada.etapa}`,
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

  if (anterior.clienteId !== atualizada.clienteId) {
    eventos.push({
      tipo: "vinculo_cliente_atualizado",
      descricao: `Cliente vinculado: ${atualizada.clienteNome || "nao informado"}`,
    });
  }

  if (anterior.corretorId !== atualizada.corretorId) {
    eventos.push({
      tipo: "vinculo_corretor_atualizado",
      descricao: `Corretor vinculado: ${atualizada.corretorNome || "nao informado"}`,
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
      status: "simulacao",
      etapa: "inicial",
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
