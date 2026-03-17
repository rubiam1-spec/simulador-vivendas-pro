import { supabase } from "../lib/supabase";
import type {
  EventoNegociacao,
  NegociacaoSalva,
  TipoEventoNegociacao,
  UnidadeNegociacao,
} from "../types/negociacao";

type EventoNegociacaoInput = {
  tipo: TipoEventoNegociacao;
  descricao: string;
  metadados?: Record<string, string>;
};

function createId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `neg_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function criarEvento(input: EventoNegociacaoInput): EventoNegociacao {
  return {
    id: createId(),
    tipo: input.tipo,
    descricao: input.descricao,
    dataHora: new Date().toISOString(),
    metadados: input.metadados,
  };
}

function getSupabaseClient() {
  if (!supabase) {
    throw new Error("Supabase nao configurado.");
  }

  return supabase;
}

function getResumoLotes(unidades: UnidadeNegociacao[]) {
  if (!Array.isArray(unidades) || unidades.length === 0) {
    return "";
  }

  return unidades
    .map((unidade) => {
      const quadra = unidade.quadra ? `Q${unidade.quadra}` : "";
      const lote = unidade.lote ? `L${unidade.lote}` : "";
      return [quadra, lote].filter(Boolean).join(" ");
    })
    .filter(Boolean)
    .join(" • ");
}

function fromDb(row: Record<string, unknown>): NegociacaoSalva {
  const unidades = ((row.unidades as NegociacaoSalva["unidades"]) ?? []) as UnidadeNegociacao[];

  return {
    id: row.id as string,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
    titulo: (row.titulo as string) ?? "",
    tipo: (row.tipo as NegociacaoSalva["tipo"]) ?? "simulacao",
    status: (row.status as NegociacaoSalva["status"]) ?? "simulacao",
    etapa: (row.etapa as NegociacaoSalva["etapa"]) ?? "inicial",
    prioridade: (row.prioridade as NegociacaoSalva["prioridade"]) ?? "media",
    origem: (row.origem as NegociacaoSalva["origem"]) ?? "outro",
    observacoes: (row.observacoes as string) ?? "",
    observacaoInterna: (row.observacao_interna as string) ?? "",
    ultimaAcao: (row.ultima_acao as string) ?? "",
    clienteId: (row.cliente_id as string | null) ?? null,
    clienteNome: (row.cliente_nome as string) ?? "",
    cliente: (row.cliente as string) ?? "",
    clienteCpf: (row.cliente_cpf as string) ?? "",
    clienteTelefone: (row.cliente_telefone as string) ?? "",
    clienteEmail: (row.cliente_email as string) ?? "",
    clienteProfissao: (row.cliente_profissao as string) ?? "",
    clienteEstadoCivil: (row.cliente_estado_civil as string) ?? "",
    corretorId: (row.corretor_id as string | null) ?? null,
    corretorNome: (row.corretor_nome as string) ?? "",
    corretor: (row.corretor as string) ?? "",
    creci: (row.creci as string) ?? "",
    imobiliaria: (row.imobiliaria as string) ?? "",
    consultoraId: (row.consultora_id as string | null) ?? null,
    consultoraNome: (row.consultora_nome as string) ?? "",
    valorTotal: Number(row.valor_total ?? 0),
    entrada: Number(row.entrada ?? 0),
    saldoFinal: Number(row.saldo_final ?? 0),
    permuta: (row.permuta as NegociacaoSalva["permuta"]) ?? null,
    veiculo: (row.veiculo as NegociacaoSalva["veiculo"]) ?? null,
    unidades,
    resumoLotes: getResumoLotes(unidades),
    simulacao: (row.simulacao as NegociacaoSalva["simulacao"]) ?? ({} as NegociacaoSalva["simulacao"]),
    proposta: (row.proposta as NegociacaoSalva["proposta"]) ?? ({} as NegociacaoSalva["proposta"]),
    contraproposta:
      (row.contraproposta as NegociacaoSalva["contraproposta"]) ??
      ({} as NegociacaoSalva["contraproposta"]),
    payloadSimulacao:
      (row.payload_simulacao as NegociacaoSalva["payloadSimulacao"]) ??
      ({} as NegociacaoSalva["payloadSimulacao"]),
    historico: (row.historico as EventoNegociacao[]) ?? [],
  };
}

function toDb(neg: Partial<NegociacaoSalva>) {
  const result: Record<string, unknown> = {};

  if (neg.titulo !== undefined) result.titulo = neg.titulo;
  if (neg.tipo !== undefined) result.tipo = neg.tipo;
  if (neg.status !== undefined) result.status = neg.status;
  if (neg.etapa !== undefined) result.etapa = neg.etapa;
  if (neg.prioridade !== undefined) result.prioridade = neg.prioridade;
  if (neg.origem !== undefined) result.origem = neg.origem;
  if (neg.observacoes !== undefined) result.observacoes = neg.observacoes;
  if (neg.observacaoInterna !== undefined) result.observacao_interna = neg.observacaoInterna;
  if (neg.ultimaAcao !== undefined) result.ultima_acao = neg.ultimaAcao;
  if (neg.clienteId !== undefined) result.cliente_id = neg.clienteId || null;
  if (neg.clienteNome !== undefined) result.cliente_nome = neg.clienteNome;
  if (neg.cliente !== undefined) result.cliente = neg.cliente;
  if (neg.clienteCpf !== undefined) result.cliente_cpf = neg.clienteCpf;
  if (neg.clienteTelefone !== undefined) result.cliente_telefone = neg.clienteTelefone;
  if (neg.clienteEmail !== undefined) result.cliente_email = neg.clienteEmail;
  if (neg.clienteProfissao !== undefined) result.cliente_profissao = neg.clienteProfissao;
  if (neg.clienteEstadoCivil !== undefined) result.cliente_estado_civil = neg.clienteEstadoCivil;
  if (neg.corretorId !== undefined) result.corretor_id = neg.corretorId || null;
  if (neg.corretorNome !== undefined) result.corretor_nome = neg.corretorNome;
  if (neg.corretor !== undefined) result.corretor = neg.corretor;
  if (neg.creci !== undefined) result.creci = neg.creci;
  if (neg.imobiliaria !== undefined) result.imobiliaria = neg.imobiliaria;
  if (neg.consultoraId !== undefined) result.consultora_id = neg.consultoraId || null;
  if (neg.consultoraNome !== undefined) result.consultora_nome = neg.consultoraNome;
  if (neg.valorTotal !== undefined) result.valor_total = neg.valorTotal;
  if (neg.entrada !== undefined) result.entrada = neg.entrada;
  if (neg.saldoFinal !== undefined) result.saldo_final = neg.saldoFinal;
  if (neg.permuta !== undefined) result.permuta = neg.permuta;
  if (neg.veiculo !== undefined) result.veiculo = neg.veiculo;
  if (neg.unidades !== undefined) result.unidades = neg.unidades;
  if (neg.simulacao !== undefined) result.simulacao = neg.simulacao;
  if (neg.proposta !== undefined) result.proposta = neg.proposta;
  if (neg.contraproposta !== undefined) result.contraproposta = neg.contraproposta;
  if (neg.payloadSimulacao !== undefined) result.payload_simulacao = neg.payloadSimulacao;
  if (neg.historico !== undefined) result.historico = neg.historico;

  return result;
}

export async function listarNegociacoesSalvas(options?: {
  consultoraUserId?: string | null;
}): Promise<NegociacaoSalva[]> {
  if (!supabase) {
    console.error("[negociacoes] supabase client nao inicializado");
    return [];
  }

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    console.error("[negociacoes] sem sessao ativa:", authError?.message);
    return [];
  }

  let query = supabase
    .from("negociacoes")
    .select("*", { count: "exact" })
    .order("updated_at", { ascending: false });

  if (options?.consultoraUserId) {
    query = query.or(`user_id.eq.${options.consultoraUserId},created_by.eq.${options.consultoraUserId}`);
  }

  const { data, error, count } = await query;

  if (error) {
    const { code, message, details, hint } = error as typeof error & { code?: string; hint?: string };
    console.error("[negociacoes] erro RLS/query:", { code, message, details, hint });
    return [];
  }

  console.log(`[negociacoes] ok — ${count} registro(s) para user ${user.email}`);
  return (data ?? []).map((row) => fromDb(row as Record<string, unknown>));
}

export async function buscarNegociacaoPorId(id: string): Promise<NegociacaoSalva | null> {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("negociacoes")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) return null;
  return fromDb(data as Record<string, unknown>);
}

export async function salvarNovaNegociacao(
  negociacao: Omit<NegociacaoSalva, "id" | "createdAt" | "updatedAt">,
  eventosExtras: EventoNegociacaoInput[] = []
): Promise<NegociacaoSalva> {
  const client = getSupabaseClient();
  const {
    data: { user },
  } = await client.auth.getUser();

  const eventosCriacao: EventoNegociacao[] = [
    criarEvento({ tipo: "negociacao_criada", descricao: "Negociacao criada" }),
    ...eventosExtras.map(criarEvento),
  ];

  const historicoCombinado: EventoNegociacao[] = [
    ...eventosCriacao,
    ...((negociacao.historico as EventoNegociacao[]) ?? []),
  ];

  const payload = {
    ...toDb({ ...negociacao, historico: historicoCombinado }),
    user_id: user?.id ?? null,
    created_by: user?.id ?? null,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await client
    .from("negociacoes")
    .insert(payload)
    .select("*")
    .single();

  if (error || !data) {
    console.error("[negociacoesStorageSupabase] erro ao salvar", error);
    throw new Error(error?.message ?? "Erro ao salvar negociacao");
  }

  return fromDb(data as Record<string, unknown>);
}

export async function atualizarNegociacao(
  id: string,
  dadosAtualizados: Partial<Omit<NegociacaoSalva, "id" | "createdAt">>,
  eventosExtras: EventoNegociacaoInput[] = []
): Promise<NegociacaoSalva | null> {
  const client = getSupabaseClient();
  const atual = await buscarNegociacaoPorId(id);
  if (!atual) return null;

  const novosEventos: EventoNegociacao[] = eventosExtras.map(criarEvento);
  const historicoCombinado: EventoNegociacao[] = [
    ...novosEventos,
    ...(atual.historico ?? []),
  ];

  const payload = {
    ...toDb({ ...dadosAtualizados, historico: historicoCombinado }),
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await client
    .from("negociacoes")
    .update(payload)
    .eq("id", id)
    .select("*")
    .single();

  if (error || !data) {
    console.error("[negociacoesStorageSupabase] erro ao atualizar", error);
    return null;
  }

  return fromDb(data as Record<string, unknown>);
}

export async function adicionarEventoNegociacao(
  id: string,
  evento: EventoNegociacaoInput
): Promise<NegociacaoSalva | null> {
  return atualizarNegociacao(id, {}, [evento]);
}

export function excluirNegociacao(id: string): void {
  if (!supabase) return;
  void supabase.from("negociacoes").delete().eq("id", id);
}

export async function duplicarNegociacao(id: string): Promise<NegociacaoSalva | null> {
  const original = await buscarNegociacaoPorId(id);
  if (!original) return null;

  const { id: _id, createdAt: _c, updatedAt: _u, ...resto } = original;
  void _id;
  void _c;
  void _u;

  return salvarNovaNegociacao(
    {
      ...resto,
      titulo: `${original.titulo} (copia)`,
      status: "simulacao",
      etapa: "inicial",
      ultimaAcao: "Negociacao duplicada",
    },
    [{ tipo: "negociacao_duplicada", descricao: "Negociacao duplicada" }]
  );
}
