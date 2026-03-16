export type CorretorStatus =
  | "ativo"
  | "em_formacao"
  | "pausado"
  | "inativo";

export type Corretor = {
  id: string;
  nome: string;
  telefone: string;
  email: string;
  imobiliaria: string;
  creci: string;
  status: CorretorStatus;
  observacoes: string;
  createdAt: string;
  updatedAt: string;
};

export type CreateCorretorInput = Omit<
  Corretor,
  "id" | "createdAt" | "updatedAt"
>;

export type UpdateCorretorInput = Partial<CreateCorretorInput>;
