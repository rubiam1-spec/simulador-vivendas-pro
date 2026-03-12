export type TipoNegociacao = "simulacao" | "proposta" | "contraproposta";

export type StatusNegociacao =
  | "rascunho"
  | "em_negociacao"
  | "aprovada"
  | "arquivada";

export type TipoEntradaSalva = "percentual" | "valor";
export type TipoBalaoSalvo = "anual" | "semestral";
export type FormaSaldoFinalSalva =
  | "quitacao"
  | "financiamento"
  | "a_definir";

export type UnidadeNegociacao = {
  chave: string;
  quadra: string;
  lote: string;
  valor: number;
  status?: string;
};

export type AtivoNegociadoSalvo = {
  descricao: string;
  valor: number;
};

export type CondicaoPagamentoSalva = {
  entradaTipo: TipoEntradaSalva;
  entradaValor: number;
  temBalao: boolean;
  parcelasMeses: number;
  baloesSemestrais: number;
  percentualParcelas: number;
  percentualBaloes: number;
  temSaldoFinal: boolean;
  saldoFinalTipo: TipoEntradaSalva;
  saldoFinalPercentual: number;
  saldoFinalValor: number;
  saldoFinalVencimento: string;
  saldoFinalForma: FormaSaldoFinalSalva;
};

export type SimulacaoSalva = {
  entradaPercentual: number;
  temBalao: boolean;
  parcelasMeses: number;
  baloesSemestrais: number;
  temSaldoFinal: boolean;
  saldoFinalTipo: TipoEntradaSalva;
  saldoFinalPercentual: number;
  saldoFinalValor: number;
  saldoFinalVencimento: string;
  saldoFinalForma: FormaSaldoFinalSalva;
  temPermuta: boolean;
  permuta: AtivoNegociadoSalvo | null;
  temVeiculo: boolean;
  veiculo: AtivoNegociadoSalvo | null;
};

export type PropostaSalva = {
  data: string;
  valorOfertado: number;
  entradaQuantidadeParcelas: number;
  entradaPrimeiroVencimento: string;
  mensaisPrimeiroVencimento: string;
  balaoTipo: TipoBalaoSalvo;
  balaoPrimeiroVencimento: string;
  temPermuta: boolean;
  permuta: AtivoNegociadoSalvo | null;
  temVeiculo: boolean;
  veiculo: AtivoNegociadoSalvo | null;
  condicao: CondicaoPagamentoSalva;
  observacoes: string;
};

export type ContrapropostaSalva = {
  valorAprovado: number;
  temPermuta: boolean;
  permutaAceita: AtivoNegociadoSalvo | null;
  temVeiculo: boolean;
  veiculoAceito: AtivoNegociadoSalvo | null;
  condicao: CondicaoPagamentoSalva;
  validade: string;
  observacoes: string;
};

export type NegociacaoSalva = {
  id: string;
  tipo: TipoNegociacao;
  status: StatusNegociacao;
  titulo: string;
  cliente: string;
  clienteCpf: string;
  clienteTelefone: string;
  clienteEmail: string;
  clienteProfissao: string;
  clienteEstadoCivil: string;
  corretor: string;
  creci: string;
  imobiliaria: string;
  unidades: UnidadeNegociacao[];
  valorTotal: number;
  resumoLotes: string;
  createdAt: string;
  updatedAt: string;
  simulacao: SimulacaoSalva;
  proposta: PropostaSalva;
  contraproposta: ContrapropostaSalva;
};
