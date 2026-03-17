import { salvarNovaNegociacao } from "../services/negociacoesStorageSupabase";
import type { NegociacaoSalva } from "../types/negociacao";

const CHAVE_NEGOCIACOES = "central_negociacoes_bomm";

export async function migrarNegociacoesParaSupabase(): Promise<{
  migradas: number;
  erros: number;
}> {
  let migradas = 0;
  let erros = 0;

  const raw = localStorage.getItem(CHAVE_NEGOCIACOES);
  if (!raw) {
    return { migradas, erros };
  }

  let lista: NegociacaoSalva[] = [];
  try {
    const parsed = JSON.parse(raw);
    lista = Array.isArray(parsed) ? parsed : [];
  } catch {
    return { migradas, erros };
  }

  for (const neg of lista) {
    try {
      const { id: _id, createdAt: _c, updatedAt: _u, ...resto } = neg;
      void _id;
      void _c;
      void _u;

      await salvarNovaNegociacao(resto);
      migradas++;
    } catch {
      erros++;
    }
  }

  if (erros === 0 && migradas > 0) {
    localStorage.removeItem(CHAVE_NEGOCIACOES);
  }

  return { migradas, erros };
}
