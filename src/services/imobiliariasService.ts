import { supabase } from "../lib/supabase";

export type Imobiliaria = {
  id: string;
  nome: string;
  cnpj: string;
  telefone: string;
  email: string;
  ativo: boolean;
  createdAt: string;
};

export type CreateImobiliariaInput = Omit<Imobiliaria, "id" | "createdAt">;
export type UpdateImobiliariaInput = Partial<CreateImobiliariaInput>;

type ImobiliariaRow = {
  id: string;
  nome: string;
  cnpj: string | null;
  telefone: string | null;
  email: string | null;
  ativo: boolean;
  created_at: string;
};

function fromRow(row: ImobiliariaRow): Imobiliaria {
  return {
    id: row.id,
    nome: row.nome,
    cnpj: row.cnpj ?? "",
    telefone: row.telefone ?? "",
    email: row.email ?? "",
    ativo: row.ativo,
    createdAt: row.created_at,
  };
}

function getClient() {
  if (!supabase) throw new Error("Supabase não configurado.");
  return supabase;
}

export async function listImobiliarias(): Promise<Imobiliaria[]> {
  const client = getClient();
  const { data, error } = await client
    .from("imobiliarias")
    .select("*")
    .eq("ativo", true)
    .order("nome", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((row) => fromRow(row as ImobiliariaRow));
}

export async function listAllImobiliarias(): Promise<Imobiliaria[]> {
  const client = getClient();
  const { data, error } = await client
    .from("imobiliarias")
    .select("*")
    .order("nome", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((row) => fromRow(row as ImobiliariaRow));
}

export async function createImobiliaria(
  input: CreateImobiliariaInput
): Promise<Imobiliaria> {
  const client = getClient();
  const { data, error } = await client
    .from("imobiliarias")
    .insert({
      nome: input.nome,
      cnpj: input.cnpj || null,
      telefone: input.telefone || null,
      email: input.email || null,
      ativo: input.ativo,
    })
    .select("*")
    .single();
  if (error) throw error;
  return fromRow(data as ImobiliariaRow);
}

export async function updateImobiliaria(
  id: string,
  input: UpdateImobiliariaInput
): Promise<Imobiliaria> {
  const client = getClient();
  const payload: Record<string, unknown> = {};
  if (input.nome !== undefined) payload.nome = input.nome;
  if (input.cnpj !== undefined) payload.cnpj = input.cnpj || null;
  if (input.telefone !== undefined) payload.telefone = input.telefone || null;
  if (input.email !== undefined) payload.email = input.email || null;
  if (input.ativo !== undefined) payload.ativo = input.ativo;

  const { data, error } = await client
    .from("imobiliarias")
    .update(payload)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return fromRow(data as ImobiliariaRow);
}

export async function deleteImobiliaria(id: string): Promise<void> {
  const client = getClient();
  const { error } = await client.from("imobiliarias").delete().eq("id", id);
  if (error) throw error;
}
