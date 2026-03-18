import { supabase } from "../lib/supabase";
import type {
  Cliente,
  ClienteStatus,
  CreateClienteInput,
  OrigemLead,
  UpdateClienteInput,
} from "../types/cliente";

type ClienteRow = {
  id: string;
  nome: string;
  telefone: string | null;
  email: string | null;
  cpf: string | null;
  origem: OrigemLead | null;
  status: ClienteStatus | null;
  observacoes: string | null;
  created_at: string;
  updated_at: string;
  user_id: string | null;
};

function statusValido(status: unknown): status is ClienteStatus {
  return [
    "novo",
    "em_atendimento",
    "proposta_enviada",
    "negociando",
    "convertido",
    "inativo",
  ].includes(String(status));
}

function origemValida(origem: unknown): origem is OrigemLead {
  return [
    "site",
    "indicacao",
    "trafego_pago",
    "corretor",
    "feira",
    "whatsapp",
    "outro",
  ].includes(String(origem));
}

function fromRow(row: ClienteRow): Cliente {
  return {
    id: row.id,
    nome: row.nome,
    telefone: row.telefone ?? "",
    email: row.email ?? "",
    cpf: row.cpf ?? "",
    cidade: "",
    origemLead: origemValida(row.origem) ? row.origem : "outro",
    status: statusValido(row.status) ? row.status : "novo",
    corretorResponsavel: "",
    observacoes: row.observacoes ?? "",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function getClient() {
  if (!supabase) throw new Error("Supabase não configurado.");
  return supabase;
}

export async function listClientes(): Promise<Cliente[]> {
  const client = getClient();
  const { data, error } = await client
    .from("clientes")
    .select("*")
    .order("nome", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((row) => fromRow(row as ClienteRow));
}

export async function getClienteById(id: string): Promise<Cliente | null> {
  const client = getClient();
  const { data, error } = await client
    .from("clientes")
    .select("*")
    .eq("id", id)
    .single();
  if (error || !data) return null;
  return fromRow(data as ClienteRow);
}

export async function createCliente(
  input: CreateClienteInput
): Promise<Cliente> {
  const client = getClient();
  const { data: { user } } = await client.auth.getUser();
  const { data, error } = await client
    .from("clientes")
    .insert({
      nome: input.nome,
      telefone: input.telefone || null,
      email: input.email || null,
      cpf: input.cpf || null,
      origem: input.origemLead || null,
      status: input.status || null,
      observacoes: input.observacoes || null,
      user_id: user?.id ?? null,
    })
    .select("*")
    .single();
  if (error) throw error;
  return fromRow(data as ClienteRow);
}

export async function updateCliente(
  id: string,
  input: UpdateClienteInput
): Promise<Cliente | null> {
  const client = getClient();
  const payload: Record<string, unknown> = {};
  if (input.nome !== undefined) payload.nome = input.nome;
  if (input.telefone !== undefined) payload.telefone = input.telefone || null;
  if (input.email !== undefined) payload.email = input.email || null;
  if (input.cpf !== undefined) payload.cpf = input.cpf || null;
  if (input.cidade !== undefined) payload.cidade = input.cidade || null;
  if (input.origemLead !== undefined) payload.origem_lead = input.origemLead;
  if (input.status !== undefined) payload.status = input.status;
  if (input.corretorResponsavel !== undefined)
    payload.corretor_responsavel = input.corretorResponsavel || null;
  if (input.observacoes !== undefined)
    payload.observacoes = input.observacoes || null;

  const { data, error } = await client
    .from("clientes")
    .update(payload)
    .eq("id", id)
    .select("*")
    .single();
  if (error) return null;
  return fromRow(data as ClienteRow);
}

export async function deleteCliente(id: string): Promise<void> {
  const client = getClient();
  const { error } = await client.from("clientes").delete().eq("id", id);
  if (error) throw error;
}

export async function migrarClientesDoLocalStorage(): Promise<{
  migrados: number;
  erros: number;
}> {
  const STORAGE_KEY = "rr_crm_clientes_v1";
  let migrados = 0;
  let erros = 0;

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { migrados, erros };
    const lista = JSON.parse(raw) as Cliente[];
    if (!Array.isArray(lista) || lista.length === 0) return { migrados, erros };

    const client = getClient();

    for (const cliente of lista) {
      try {
        const { error } = await client.from("clientes").insert({
          nome: cliente.nome,
          telefone: cliente.telefone || null,
          email: cliente.email || null,
          cpf: cliente.cpf || null,
          cidade: cliente.cidade || null,
          origem_lead: cliente.origemLead,
          status: cliente.status,
          corretor_responsavel: cliente.corretorResponsavel || null,
          observacoes: cliente.observacoes || null,
        });
        if (!error) migrados++;
        else erros++;
      } catch {
        erros++;
      }
    }

    if (erros === 0 && migrados > 0) {
      localStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    // localStorage inacessível
  }

  return { migrados, erros };
}
