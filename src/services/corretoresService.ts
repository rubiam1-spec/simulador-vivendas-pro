import type {
  Corretor,
  CorretorStatus,
  CreateCorretorInput,
  UpdateCorretorInput,
} from "../types/corretor";

const STORAGE_KEY = "rr_crm_corretores_v1";

type CorretorRow = Partial<Corretor> & {
  created_at?: string;
  updated_at?: string;
};

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function createId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `cor_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function statusValido(status: unknown): status is CorretorStatus {
  return ["ativo", "em_formacao", "pausado", "inativo"].includes(String(status));
}

function normalizeCorretor(row: CorretorRow): Corretor {
  return {
    id: String(row.id || createId()),
    nome: String(row.nome || ""),
    telefone: String(row.telefone || ""),
    email: String(row.email || ""),
    imobiliaria: String(row.imobiliaria || ""),
    creci: String(row.creci || ""),
    status: statusValido(row.status) ? row.status : "ativo",
    observacoes: String(row.observacoes || ""),
    createdAt: String(row.createdAt || row.created_at || new Date().toISOString()),
    updatedAt: String(row.updatedAt || row.updated_at || new Date().toISOString()),
  };
}

function readStorage(): Corretor[] {
  if (!canUseStorage()) return [];

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(normalizeCorretor) : [];
  } catch (error) {
    console.error("[corretoresService] erro ao ler localStorage", error);
    return [];
  }
}

function writeStorage(corretores: Corretor[]) {
  if (!canUseStorage()) return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(corretores));
}

export async function listCorretores(): Promise<Corretor[]> {
  return readStorage().sort((a, b) => {
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });
}

export async function getCorretorById(id: string): Promise<Corretor | null> {
  return (await listCorretores()).find((corretor) => corretor.id === id) || null;
}

export async function createCorretor(
  input: CreateCorretorInput
): Promise<Corretor> {
  const now = new Date().toISOString();
  const corretor = normalizeCorretor({
    ...input,
    id: createId(),
    createdAt: now,
    updatedAt: now,
  });

  const corretores = await listCorretores();
  writeStorage([corretor, ...corretores]);
  return corretor;
}

export async function updateCorretor(
  id: string,
  input: UpdateCorretorInput
): Promise<Corretor | null> {
  let updated: Corretor | null = null;

  const corretores = (await listCorretores()).map((corretor) => {
    if (corretor.id !== id) return corretor;

    updated = normalizeCorretor({
      ...corretor,
      ...input,
      id: corretor.id,
      createdAt: corretor.createdAt,
      updatedAt: new Date().toISOString(),
    });

    return updated;
  });

  writeStorage(corretores);
  return updated;
}
