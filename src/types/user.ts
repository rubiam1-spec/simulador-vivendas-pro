export type UserRole = "admin" | "gestor" | "corretor" | "consultora";

export type UserProfile = {
  id: string;
  userId: string;
  nome: string;
  email: string;
  role: UserRole;
  ativo: boolean;
  createdAt: string;
  nomeExibicao?: string;
  avatarUrl?: string;
  telefone?: string;
  cargo?: string;
};

export type CreateUserAccessInput = {
  nome: string;
  email: string;
  senha: string;
  role: UserRole;
  ativo: boolean;
};

export type UpdateUserAccessInput = Partial<
  Pick<UserProfile, "nome" | "role" | "ativo">
>;
