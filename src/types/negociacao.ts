export type TipoNegociacao = "simulacao" | "proposta" | "contraproposta";

export type StatusNegociacao =
  | "rascunho"
  | "simulacao"
  | "proposta_enviada"
  | "contraproposta"
  | "em_negociacao"
  | "aguardando_retorno"
  | "aprovada"
  | "fechada"
  | "perdida"
  | "arquivada";

export type EtapaNegociacao =
  | "inicial"
  | "atendimento"
  | "proposta"
  | "retorno"
  | "fechamento";

export type PrioridadeNegociacao = "baixa" | "media" | "alta";

export type OrigemNegociacao =
  | "corretor"
  | "cliente_direto"
  | "feira"
  | "indicacao"
  | "trafego_pago"
  | "interno"
  | "outro";

export type TipoEventoNegociacao =
  | "negociacao_criada"
  | "status_alterado"
  | "prioridade_alterada"
  | "origem_alterada"
  | "observacao_interna_alterada"
  | "ultima_acao_alterada"
  | "pdf_gerado"
  | "negociacao_duplicada"
  | "negociacao_aberta"
  | "negociacao_atualizada"
  | "etapa_alterada"
  | "vinculo_cliente_atualizado"
  | "vinculo_corretor_atualizado";

export type EventoNegociacao = {
  id: string;
  tipo: TipoEventoNegociacao;
  descricao: string;
  dataHora: string;
  metadados?: Record<string, string>;
};

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

export type PayloadSimulacaoNegociacao = {
  modoDocumento: TipoNegociacao;
  cliente: {
    id: string | null;
    nome: string;
    cpf: string;
    telefone: string;
    email: string;
    profissao: string;
    estadoCivil: string;
  };
  corretor: {
    id: string | null;
    nome: string;
    creci: string;
    imobiliaria: string;
  };
  lotes: UnidadeNegociacao[];
  simulacao: SimulacaoSalva;
  proposta: PropostaSalva;
  contraproposta: ContrapropostaSalva;
};

export type NegociacaoSalva = {
  id: string;
  tipo: TipoNegociacao;
  status: StatusNegociacao;
  etapa: EtapaNegociacao;
  prioridade: PrioridadeNegociacao;
  origem: OrigemNegociacao;
  observacaoInterna: string;
  observacoes: string;
  ultimaAcao: string;
  titulo: string;
  clienteId: string | null;
  clienteNome: string;
  cliente: string;
  clienteCpf: string;
  clienteTelefone: string;
  clienteEmail: string;
  clienteProfissao: string;
  clienteEstadoCivil: string;
  corretorId: string | null;
  corretorNome: string;
  corretor: string;
  creci: string;
  imobiliaria: string;
  unidades: UnidadeNegociacao[];
  valorTotal: number;
  entrada: number;
  saldoFinal: number;
  permuta: AtivoNegociadoSalvo | null;
  veiculo: AtivoNegociadoSalvo | null;
  resumoLotes: string;
  payloadSimulacao: PayloadSimulacaoNegociacao;
  createdAt: string;
  updatedAt: string;
  historico: EventoNegociacao[];
  simulacao: SimulacaoSalva;
  proposta: PropostaSalva;
  contraproposta: ContrapropostaSalva;
};
