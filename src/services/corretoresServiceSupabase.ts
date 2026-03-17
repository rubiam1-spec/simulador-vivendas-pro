import { supabase } from "../lib/supabase";
import type {
  Corretor,
  CorretorStatus,
  CreateCorretorInput,
  UpdateCorretorInput,
} from "../types/corretor";

type CorretorRow = {
  id: string;
  nome: string;
  telefone: string | null;
  email: string | null;
  imobiliaria: string | null;
  creci: string | null;
  status: CorretorStatus;
  observacoes: string | null;
  created_at: string;
  updated_at: string;
};

function statusValido(status: unknown): status is CorretorStatus {
  return ["ativo", "em_formacao", "pausado", "inativo"].includes(String(status));
}

function fromRow(row: CorretorRow): Corretor {
  return {
    id: row.id,
    nome: row.nome,
    telefone: row.telefone ?? "",
    email: row.email ?? "",
    imobiliaria: row.imobiliaria ?? "",
    creci: row.creci ?? "",
    status: statusValido(row.status) ? row.status : "ativo",
    observacoes: row.observacoes ?? "",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function getClient() {
  if (!supabase) throw new Error("Supabase não configurado.");
  return supabase;
}

export async function listCorretores(): Promise<Corretor[]> {
  const client = getClient();
  const { data, error } = await client
    .from("corretores")
    .select("*")
    .order("nome", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((row) => fromRow(row as CorretorRow));
}

export async function getCorretorById(id: string): Promise<Corretor | null> {
  const client = getClient();
  const { data, error } = await client
    .from("corretores")
    .select("*")
    .eq("id", id)
    .single();
  if (error || !data) return null;
  return fromRow(data as CorretorRow);
}

export async function createCorretor(
  input: CreateCorretorInput
): Promise<Corretor> {
  const client = getClient();
  const { data, error } = await client
    .from("corretores")
    .insert({
      nome: input.nome,
      telefone: input.telefone || null,
      email: input.email || null,
      imobiliaria: input.imobiliaria || null,
      creci: input.creci || null,
      status: input.status,
      observacoes: input.observacoes || null,
    })
    .select("*")
    .single();
  if (error) throw error;
  return fromRow(data as CorretorRow);
}

export async function updateCorretor(
  id: string,
  input: UpdateCorretorInput
): Promise<Corretor | null> {
  const client = getClient();
  const payload: Record<string, unknown> = {};
  if (input.nome !== undefined) payload.nome = input.nome;
  if (input.telefone !== undefined) payload.telefone = input.telefone || null;
  if (input.email !== undefined) payload.email = input.email || null;
  if (input.imobiliaria !== undefined)
    payload.imobiliaria = input.imobiliaria || null;
  if (input.creci !== undefined) payload.creci = input.creci || null;
  if (input.status !== undefined) payload.status = input.status;
  if (input.observacoes !== undefined)
    payload.observacoes = input.observacoes || null;

  const { data, error } = await client
    .from("corretores")
    .update(payload)
    .eq("id", id)
    .select("*")
    .single();
  if (error) return null;
  return fromRow(data as CorretorRow);
}

export async function deleteCorretor(id: string): Promise<void> {
  const client = getClient();
  const { error } = await client.from("corretores").delete().eq("id", id);
  if (error) throw error;
}

export async function migrarCorretoresDoLocalStorage(): Promise<{
  migrados: number;
  erros: number;
}> {
  const STORAGE_KEY = "rr_crm_corretores_v1";
  let migrados = 0;
  let erros = 0;

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { migrados, erros };
    const lista = JSON.parse(raw) as Corretor[];
    if (!Array.isArray(lista) || lista.length === 0) return { migrados, erros };

    const client = getClient();

    for (const corretor of lista) {
      try {
        const { error } = await client.from("corretores").insert({
          nome: corretor.nome,
          telefone: corretor.telefone || null,
          email: corretor.email || null,
          imobiliaria: corretor.imobiliaria || null,
          creci: corretor.creci || null,
          status: corretor.status,
          observacoes: corretor.observacoes || null,
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
