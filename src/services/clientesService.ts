import type {
  Cliente,
  ClienteStatus,
  CreateClienteInput,
  OrigemLead,
  UpdateClienteInput,
} from "../types/cliente";

const STORAGE_KEY = "rr_crm_clientes_v1";

type ClienteRow = Partial<Cliente> & {
  created_at?: string;
  updated_at?: string;
  origem_lead?: OrigemLead;
  corretor_responsavel?: string;
};

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function createId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `cli_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

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

function normalizeCliente(row: ClienteRow): Cliente {
  return {
    id: String(row.id || createId()),
    nome: String(row.nome || ""),
    telefone: String(row.telefone || ""),
    email: String(row.email || ""),
    cpf: String(row.cpf || ""),
    cidade: String(row.cidade || ""),
    origemLead: origemValida(row.origemLead || row.origem_lead)
      ? (row.origemLead || row.origem_lead)!
      : "outro",
    status: statusValido(row.status) ? row.status : "novo",
    corretorResponsavel: String(
      row.corretorResponsavel || row.corretor_responsavel || ""
    ),
    observacoes: String(row.observacoes || ""),
    createdAt: String(row.createdAt || row.created_at || new Date().toISOString()),
    updatedAt: String(row.updatedAt || row.updated_at || new Date().toISOString()),
  };
}

function readStorage(): Cliente[] {
  if (!canUseStorage()) return [];

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(normalizeCliente) : [];
  } catch (error) {
    console.error("[clientesService] erro ao ler localStorage", error);
    return [];
  }
}

function writeStorage(clientes: Cliente[]) {
  if (!canUseStorage()) return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(clientes));
}

export async function listClientes(): Promise<Cliente[]> {
  return readStorage().sort((a, b) => {
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });
}

export async function getClienteById(id: string): Promise<Cliente | null> {
  return (await listClientes()).find((cliente) => cliente.id === id) || null;
}

export async function createCliente(input: CreateClienteInput): Promise<Cliente> {
  const now = new Date().toISOString();
  const cliente = normalizeCliente({
    ...input,
    id: createId(),
    createdAt: now,
    updatedAt: now,
  });

  const clientes = await listClientes();
  writeStorage([cliente, ...clientes]);
  return cliente;
}

export async function updateCliente(
  id: string,
  input: UpdateClienteInput
): Promise<Cliente | null> {
  let updated: Cliente | null = null;

  const clientes = (await listClientes()).map((cliente) => {
    if (cliente.id !== id) return cliente;

    updated = normalizeCliente({
      ...cliente,
      ...input,
      id: cliente.id,
      createdAt: cliente.createdAt,
      updatedAt: new Date().toISOString(),
    });

    return updated;
  });

  writeStorage(clientes);
  return updated;
}
