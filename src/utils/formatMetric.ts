/**
 * Formata valores numéricos para exibição em cards de métricas.
 * Segue o padrão de dashboards profissionais (Stripe, Linear, Vercel).
 *
 * Exemplos:
 *   8075377.05  → "R$ 8,07M"
 *   1153625.29  → "R$ 1,15M"
 *   948000      → "R$ 948K"
 *   12500       → "R$ 12,5K"
 *   980         → "R$ 980"
 *   7           → "7"
 */
export function formatCurrency(value: number): string {
  if (!Number.isFinite(value)) return 'R$ 0';

  const abs = Math.abs(value);

  if (abs >= 1_000_000) {
    const m = value / 1_000_000;
    return `R$ ${m.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}M`;
  }

  if (abs >= 1_000) {
    const k = value / 1_000;
    return `R$ ${k.toLocaleString('pt-BR', {
      minimumFractionDigits: k % 1 === 0 ? 0 : 1,
      maximumFractionDigits: 1,
    })}K`;
  }

  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

/**
 * Formata contadores inteiros (ex: número de negociações).
 * Acima de 999 usa abreviação: 1.2K, 34K, 1,2M.
 */
export function formatCount(value: number): string {
  if (!Number.isFinite(value)) return '0';
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return String(value);
}

/**
 * Retorna o valor completo formatado para uso em tooltip.
 * Ex: R$ 8.075.377,05
 */
export function formatCurrencyFull(value: number): string {
  if (!Number.isFinite(value)) return 'R$ 0,00';
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}
