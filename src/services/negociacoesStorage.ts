import type { NegociacaoSalva } from "../types/negociacao";

const STORAGE_KEY = "central_negociacoes_bomm";

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function readStorage(): NegociacaoSalva[] {
  if (!canUseStorage()) return [];

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as NegociacaoSalva[]) : [];
  } catch (error) {
    console.error("[negociacoesStorage] erro ao ler localStorage", error);
    return [];
  }
}

function writeStorage(negociacoes: NegociacaoSalva[]) {
  if (!canUseStorage()) return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(negociacoes));
}

function createId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `neg_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
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
  negociacao: Omit<NegociacaoSalva, "id" | "createdAt" | "updatedAt">
): NegociacaoSalva {
  const agora = new Date().toISOString();
  const completa: NegociacaoSalva = {
    ...negociacao,
    id: createId(),
    createdAt: agora,
    updatedAt: agora,
  };

  const negociacoes = listarNegociacoesSalvas();
  writeStorage([completa, ...negociacoes]);
  return completa;
}

export function atualizarNegociacao(
  id: string,
  dadosAtualizados: Partial<Omit<NegociacaoSalva, "id" | "createdAt">>
): NegociacaoSalva | null {
  let atualizada: NegociacaoSalva | null = null;

  const negociacoes = listarNegociacoesSalvas().map((negociacao) => {
    if (negociacao.id !== id) return negociacao;

    atualizada = {
      ...negociacao,
      ...dadosAtualizados,
      id: negociacao.id,
      createdAt: negociacao.createdAt,
      updatedAt: new Date().toISOString(),
    };

    return atualizada;
  });

  writeStorage(negociacoes);
  return atualizada;
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
  const duplicada: NegociacaoSalva = {
    ...original,
    id: createId(),
    titulo: `${original.titulo} (cópia)`,
    status: "rascunho",
    createdAt: agora,
    updatedAt: agora,
  };

  const negociacoes = listarNegociacoesSalvas();
  writeStorage([duplicada, ...negociacoes]);
  return duplicada;
}
