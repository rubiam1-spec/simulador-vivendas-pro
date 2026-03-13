const NEGOCIACAO_AGENDADA_KEY = "negociacao_agendada_bomm";

export function agendarAberturaNegociacao(id: string) {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(NEGOCIACAO_AGENDADA_KEY, id);
}

export function consumirNegociacaoAgendada() {
  if (typeof window === "undefined") return null;

  const id = window.sessionStorage.getItem(NEGOCIACAO_AGENDADA_KEY);
  if (!id) return null;

  window.sessionStorage.removeItem(NEGOCIACAO_AGENDADA_KEY);
  return id;
}
