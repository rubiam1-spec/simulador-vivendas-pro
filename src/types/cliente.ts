export type ClienteStatus =
  | "novo"
  | "em_atendimento"
  | "proposta_enviada"
  | "negociando"
  | "convertido"
  | "inativo";

export type OrigemLead =
  | "site"
  | "indicacao"
  | "trafego_pago"
  | "corretor"
  | "feira"
  | "whatsapp"
  | "outro";

export type Cliente = {
  id: string;
  nome: string;
  telefone: string;
  email: string;
  cpf: string;
  cidade: string;
  origemLead: OrigemLead;
  status: ClienteStatus;
  corretorResponsavel: string;
  observacoes: string;
  createdAt: string;
  updatedAt: string;
};

export type CreateClienteInput = Omit<
  Cliente,
  "id" | "createdAt" | "updatedAt"
>;

export type UpdateClienteInput = Partial<CreateClienteInput>;
