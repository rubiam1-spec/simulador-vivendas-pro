import { useEffect, useMemo, useRef, useState } from "react";
import { carregarLotes, type Lote } from "../services/planilhaService";
import {
  gerarPdfContraproposta,
  gerarPdfProposta,
  gerarPdfSimulacao,
} from "../services/pdfService";
import {
  mapearSimuladorParaNegociacaoSalva,
  prepararNegociacaoParaCrm,
  reidratarNegociacaoSalva,
} from "../services/negociacoesMapper";
import {
  appendNegociacaoEvent,
  createNegociacao,
  getNegociacaoById,
  listNegociacoes,
  updateNegociacaoById,
} from "../services/negociacoesService";
import { consumirNegociacaoAgendada } from "../services/negociacoesSession";
import { useAuth } from "../components/AuthProvider";
import { useBranding } from "../hooks/useBranding";
import { listClientes } from "../services/clientesServiceSupabase";
import { listCorretores } from "../services/corretoresServiceSupabase";
import type { Cliente } from "../types/cliente";
import type { Corretor } from "../types/corretor";
import type { NegociacaoSalva } from "../types/negociacao";
import "./simulador.css";


type StatusFiltro = "todos" | "disponivel" | "indisponivel";
type ModoDocumento = "simulacao" | "proposta" | "contraproposta";
type TipoEntrada = "percentual" | "valor";
type TipoBalao = "anual" | "semestral";
type FormaSaldoFinal = "quitacao" | "financiamento" | "a_definir";

type CondicaoPagamento = {
  entradaTipo: TipoEntrada;
  entradaValor: number;
  temBalao: boolean;
  parcelasMeses: number;
  baloesSemestrais: number;
  percentualParcelas: number;
  percentualBaloes: number;
  temSaldoFinal: boolean;
  saldoFinalTipo: TipoEntrada;
  saldoFinalPercentual: number;
  saldoFinalValor: number;
  saldoFinalVencimento: string;
  saldoFinalForma: FormaSaldoFinal;
};

type AtivoNegociado = {
  descricao: string;
  valor: number;
};

type PropostaCliente = {
  data: string;
  valorOfertado: number;
  entradaQuantidadeParcelas: number;
  entradaPrimeiroVencimento: string;
  mensaisPrimeiroVencimento: string;
  balaoTipo: TipoBalao;
  balaoPrimeiroVencimento: string;
  temPermuta: boolean;
  permuta: AtivoNegociado | null;
  temVeiculo: boolean;
  veiculo: AtivoNegociado | null;
  condicao: CondicaoPagamento;
  observacoes: string;
};

type ContrapropostaBomm = {
  valorAprovado: number;
  temPermuta: boolean;
  permutaAceita: AtivoNegociado | null;
  temVeiculo: boolean;
  veiculoAceito: AtivoNegociado | null;
  condicao: CondicaoPagamento;
  validade: string;
  observacoes: string;
};

function brl(n: number) {
  return (Number.isFinite(n) ? n : 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function normalizeText(s: string) {
  return (s || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function numeroSeguro(v: unknown) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function statusDisponivel(status: string) {
  const s = normalizeText(status);
  if (!s) return true;
  return ![
    "vendido",
    "reservado",
    "indisponivel",
    "indisponível",
    "bloqueado",
  ].includes(s);
}

function toInputNumber(value: number) {
  return Number.isFinite(value) ? String(value) : "0";
}

function dataAtualInput() {
  return new Date().toISOString().slice(0, 10);
}

function chaveLote(lote: Lote) {
  return `${String(lote.quadra)}::${String(lote.lote)}`;
}

function criarCondicaoPadrao(): CondicaoPagamento {
  return normalizarCondicaoPagamento({
    entradaTipo: "percentual",
    entradaValor: 20,
    temBalao: true,
    parcelasMeses: 36,
    baloesSemestrais: 6,
    percentualParcelas: 30,
    percentualBaloes: 70,
    temSaldoFinal: false,
    saldoFinalTipo: "percentual",
    saldoFinalPercentual: 30,
    saldoFinalValor: 0,
    saldoFinalVencimento: "2027-09-30",
    saldoFinalForma: "a_definir",
  });
}

function normalizarCondicaoPagamento(
  condicao: CondicaoPagamento
): CondicaoPagamento {
  const temBalao = Boolean(condicao.temBalao);
  const baloesSemestrais = temBalao
    ? Math.max(1, Math.round(numeroSeguro(condicao.baloesSemestrais)))
    : 0;
  const semBalao = !temBalao;

  return {
    ...condicao,
    temBalao,
    entradaValor: numeroSeguro(condicao.entradaValor),
    parcelasMeses: Math.max(1, Math.round(numeroSeguro(condicao.parcelasMeses))),
    baloesSemestrais,
    percentualParcelas: semBalao
      ? 100
      : Math.max(0, numeroSeguro(condicao.percentualParcelas)),
    percentualBaloes: semBalao
      ? 0
      : Math.max(0, numeroSeguro(condicao.percentualBaloes)),
    saldoFinalPercentual: Math.max(
      0,
      Math.min(100, numeroSeguro(condicao.saldoFinalPercentual))
    ),
    saldoFinalValor: Math.max(0, numeroSeguro(condicao.saldoFinalValor)),
  };
}

function condicaoTemBalao(condicao: CondicaoPagamento) {
  return normalizarCondicaoPagamento(condicao).temBalao;
}

function descreverFluxoBalao(
  condicao: CondicaoPagamento,
  valorBalao: number,
  tipoBalao: TipoBalao = "semestral"
) {
  const condicaoNormalizada = normalizarCondicaoPagamento(condicao);

  if (!condicaoTemBalao(condicaoNormalizada) || valorBalao <= 0) {
    return "• Fluxo sem balão";
  }

  return `• ${condicaoNormalizada.baloesSemestrais} balões ${tipoBalao === "anual" ? "anuais" : "semestrais"} de ${brl(valorBalao)}`;
}

function calcularEntrada(valorBase: number, condicao: CondicaoPagamento) {
  if (condicao.entradaTipo === "valor") {
    return Math.max(0, numeroSeguro(condicao.entradaValor));
  }

  return Math.max(0, valorBase * (numeroSeguro(condicao.entradaValor) / 100));
}

function calcularResumoFinanceiro(
  valorBase: number,
  condicao: CondicaoPagamento,
  valorPermuta: number,
  valorVeiculo: number
) {
  const condicaoNormalizada = normalizarCondicaoPagamento(condicao);
  const entrada = calcularEntrada(valorBase, condicaoNormalizada);
  const saldoInicial = Math.max(valorBase - entrada, 0);
  const saldoAposEntrada = saldoInicial;
  const valorSaldoFinal = condicaoNormalizada.temSaldoFinal
    ? condicaoNormalizada.saldoFinalTipo === "valor"
      ? Math.min(
          Math.max(0, numeroSeguro(condicaoNormalizada.saldoFinalValor)),
          saldoAposEntrada
        )
      : Math.min(
          Math.max(
            0,
            saldoAposEntrada *
              (numeroSeguro(condicaoNormalizada.saldoFinalPercentual) / 100)
          ),
          saldoAposEntrada
        )
    : 0;
  const saldoAposSaldoFinal = Math.max(saldoAposEntrada - valorSaldoFinal, 0);
  const baseParcelasEBaloes = Math.max(
    saldoAposSaldoFinal - valorPermuta - valorVeiculo,
    0
  );
  const saldoFinal = baseParcelasEBaloes;

  const baseParcelas = condicaoTemBalao(condicaoNormalizada)
    ? baseParcelasEBaloes *
      (Math.max(0, numeroSeguro(condicaoNormalizada.percentualParcelas)) / 100)
    : baseParcelasEBaloes;
  const baseBaloes = condicaoTemBalao(condicaoNormalizada)
    ? baseParcelasEBaloes *
      (Math.max(0, numeroSeguro(condicaoNormalizada.percentualBaloes)) / 100)
    : 0;

  const valorParcela =
    condicaoNormalizada.parcelasMeses > 0
      ? baseParcelas / condicaoNormalizada.parcelasMeses
      : 0;

  const valorBalao =
    condicaoTemBalao(condicaoNormalizada) &&
    condicaoNormalizada.baloesSemestrais > 0
      ? baseBaloes / condicaoNormalizada.baloesSemestrais
      : 0;

  return {
    entrada,
    saldoInicial,
    saldoAposEntrada,
    saldoAposSaldoFinal,
    saldoFinal,
    valorSaldoFinal,
    baseParcelasEBaloes,
    baseParcelas,
    baseBaloes,
    valorParcela,
    valorBalao,
  };
}

export default function Simulador() {
  const { profile } = useAuth();
  const branding = useBranding();
  const [lotes, setLotes] = useState<Lote[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");

  const [modoDocumento, setModoDocumento] =
    useState<ModoDocumento>("simulacao");

  const [cliente, setCliente] = useState("");
  const [clienteCpf, setClienteCpf] = useState("");
  const [clienteTelefone, setClienteTelefone] = useState("");
  const [clienteEmail, setClienteEmail] = useState("");
  const [clienteProfissao, setClienteProfissao] = useState("");
  const [clienteEstadoCivil, setClienteEstadoCivil] = useState("");
  const [clientesCadastrados, setClientesCadastrados] = useState<Cliente[]>([]);
  const [clienteSelecionadoId, setClienteSelecionadoId] = useState<string>("");
  const [corretor, setCorretor] = useState("");
  const [creci, setCreci] = useState("");
  const [imobiliaria, setImobiliaria] = useState("");
  const [corretoresCadastrados, setCorretoresCadastrados] = useState<Corretor[]>([]);
  const [corretorSelecionadoId, setCorretorSelecionadoId] = useState<string>("");

  const [quadraFiltro, setQuadraFiltro] = useState("");
  const [loteFiltro, setLoteFiltro] = useState("");
  const [busca, setBusca] = useState("");
  const [statusFiltro, setStatusFiltro] = useState<StatusFiltro>("todos");
  const [travarIndisponiveis, setTravarIndisponiveis] = useState(true);

  const [lotesSelecionados, setLotesSelecionados] = useState<Lote[]>([]);

  const [entradaPercentual, setEntradaPercentual] = useState(20);
  const [temBalao, setTemBalao] = useState(true);
  const [parcelasMeses, setParcelasMeses] = useState(36);
  const [baloesSemestrais, setBaloesSemestrais] = useState(6);
  const [temSaldoFinal, setTemSaldoFinal] = useState(false);
  const [saldoFinalTipo, setSaldoFinalTipo] = useState<TipoEntrada>("percentual");
  const [saldoFinalPercentual, setSaldoFinalPercentual] = useState(30);
  const [saldoFinalValor, setSaldoFinalValor] = useState(0);
  const [saldoFinalVencimento, setSaldoFinalVencimento] = useState("2027-09-30");
  const [saldoFinalForma, setSaldoFinalForma] =
    useState<FormaSaldoFinal>("a_definir");

  const [temPermuta, setTemPermuta] = useState(false);
  const [descricaoPermuta, setDescricaoPermuta] = useState("");
  const [valorPermuta, setValorPermuta] = useState(0);

  const [temVeiculo, setTemVeiculo] = useState(false);
  const [modeloVeiculo, setModeloVeiculo] = useState("");
  const [valorVeiculo, setValorVeiculo] = useState(0);

  const [propostaCliente, setPropostaCliente] = useState<PropostaCliente>({
    data: dataAtualInput(),
    valorOfertado: 0,
    entradaQuantidadeParcelas: 1,
    entradaPrimeiroVencimento: "",
    mensaisPrimeiroVencimento: "",
    balaoTipo: "semestral",
    balaoPrimeiroVencimento: "",
    temPermuta: false,
    permuta: null,
    temVeiculo: false,
    veiculo: null,
    condicao: criarCondicaoPadrao(),
    observacoes: "",
  });

  const [contrapropostaBomm, setContrapropostaBomm] =
    useState<ContrapropostaBomm>({
      valorAprovado: 0,
      temPermuta: false,
      permutaAceita: null,
      temVeiculo: false,
      veiculoAceito: null,
      condicao: criarCondicaoPadrao(),
      validade: "",
      observacoes: "",
    });

  const [copiado, setCopiado] = useState(false);
  const [negociacoesSalvas, setNegociacoesSalvas] = useState<NegociacaoSalva[]>(
    []
  );
  const [negociacaoAtivaId, setNegociacaoAtivaId] = useState<string | null>(
    null
  );
  const [feedbackNegociacao, setFeedbackNegociacao] = useState("");
  const restaurandoContrapropostaRef = useRef(false);

  useEffect(() => {
    async function init() {
      try {
        setLoading(true);
        setErro("");
        const [dados, negociacoes, clientes, corretores] = await Promise.all([
          carregarLotes(),
          listNegociacoes(),
          listClientes(),
          listCorretores(),
        ]);
        setLotes(dados);
        setNegociacoesSalvas(negociacoes);
        setClientesCadastrados(clientes);
        setCorretoresCadastrados(corretores);
      } catch (e) {
        console.error(e);
        setErro("Não foi possível carregar os lotes agora.");
      } finally {
        setLoading(false);
      }
    }

    init();
  }, []);

  useEffect(() => {
    if (!temPermuta) {
      setDescricaoPermuta("");
      setValorPermuta(0);
    }
  }, [temPermuta]);

  useEffect(() => {
    if (!temVeiculo) {
      setModeloVeiculo("");
      setValorVeiculo(0);
    }
  }, [temVeiculo]);

  useEffect(() => {
    if (!propostaCliente.temPermuta) {
      setPropostaCliente((anterior) => ({
        ...anterior,
        permuta: null,
      }));
    }
  }, [propostaCliente.temPermuta]);

  useEffect(() => {
    if (!propostaCliente.temVeiculo) {
      setPropostaCliente((anterior) => ({
        ...anterior,
        veiculo: null,
      }));
    }
  }, [propostaCliente.temVeiculo]);

  useEffect(() => {
    if (!contrapropostaBomm.temPermuta) {
      setContrapropostaBomm((anterior) => ({
        ...anterior,
        permutaAceita: null,
      }));
    }
  }, [contrapropostaBomm.temPermuta]);

  useEffect(() => {
    if (!contrapropostaBomm.temVeiculo) {
      setContrapropostaBomm((anterior) => ({
        ...anterior,
        veiculoAceito: null,
      }));
    }
  }, [contrapropostaBomm.temVeiculo]);

  const clienteSelecionado = useMemo(
    () =>
      clientesCadastrados.find((item) => item.id === clienteSelecionadoId) || null,
    [clienteSelecionadoId, clientesCadastrados]
  );

  const corretorSelecionado = useMemo(
    () =>
      corretoresCadastrados.find((item) => item.id === corretorSelecionadoId) || null,
    [corretorSelecionadoId, corretoresCadastrados]
  );

  function aplicarClienteVinculado(clienteVinculado: Cliente | null) {
    if (!clienteVinculado) return;
    setCliente(clienteVinculado.nome || "");
    setClienteTelefone(clienteVinculado.telefone || "");
    setClienteEmail(clienteVinculado.email || "");
    setClienteCpf(clienteVinculado.cpf || "");
  }

  function aplicarCorretorVinculado(corretorVinculado: Corretor | null) {
    if (!corretorVinculado) return;
    setCorretor(corretorVinculado.nome || "");
    setCreci(corretorVinculado.creci || "");
    setImobiliaria(corretorVinculado.imobiliaria || "");
  }

  const quadras = useMemo(() => {
    const unicas = Array.from(new Set(lotes.map((l) => String(l.quadra || ""))));
    return unicas.filter(Boolean).sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [lotes]);

  const lotesDaQuadra = useMemo(() => {
    if (!quadraFiltro) return [];
    return lotes
      .filter((l) => String(l.quadra) === quadraFiltro)
      .map((l) => String(l.lote))
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b, "pt-BR", { numeric: true }));
  }, [lotes, quadraFiltro]);

  const lotesFiltrados = useMemo(() => {
    const buscaNormalizada = normalizeText(busca);

    return lotes.filter((lote) => {
      const quadraOk = !quadraFiltro || String(lote.quadra) === quadraFiltro;
      const loteOk = !loteFiltro || String(lote.lote) === loteFiltro;

      const textoBusca = normalizeText(
        `q${lote.quadra} l${lote.lote} quadra ${lote.quadra} lote ${lote.lote} ${lote.status ?? ""}`
      );
      const buscaOk = !buscaNormalizada || textoBusca.includes(buscaNormalizada);

      const disponivel = statusDisponivel(lote.status || "");
      const statusOk =
        statusFiltro === "todos"
          ? true
          : statusFiltro === "disponivel"
            ? disponivel
            : !disponivel;

      return quadraOk && loteOk && buscaOk && statusOk;
    });
  }, [lotes, quadraFiltro, loteFiltro, busca, statusFiltro]);

  const selecionadoMap = useMemo(() => {
    return new Set(lotesSelecionados.map((l) => chaveLote(l)));
  }, [lotesSelecionados]);

  function alternarSelecaoLote(lote: Lote) {
    const chave = chaveLote(lote);

    setLotesSelecionados((anterior) => {
      const jaExiste = anterior.some((item) => chaveLote(item) === chave);
      if (jaExiste) {
        return anterior.filter((item) => chaveLote(item) !== chave);
      }
      return [...anterior, lote];
    });
  }

  function limparSelecaoLotes() {
    setLotesSelecionados([]);
  }

  const quantidadeLotesSelecionados = lotesSelecionados.length;

  const unidadesSelecionadasTexto = useMemo(() => {
    if (!lotesSelecionados.length) return "Nenhuma unidade selecionada";

    return lotesSelecionados
      .map((lote) => `Q${lote.quadra} • L${lote.lote}`)
      .join(", ");
  }, [lotesSelecionados]);

  const valorTerreno = useMemo(() => {
    return lotesSelecionados.reduce(
      (acc, lote) => acc + numeroSeguro(lote.valor),
      0
    );
  }, [lotesSelecionados]);

  const permutaAplicada = temPermuta ? numeroSeguro(valorPermuta) : 0;
  const veiculoAplicado = temVeiculo ? numeroSeguro(valorVeiculo) : 0;
  const condicaoBaseSimulacao = useMemo<CondicaoPagamento>(
    () =>
      normalizarCondicaoPagamento({
        entradaTipo: "percentual",
        entradaValor: entradaPercentual,
        temBalao,
        parcelasMeses,
        baloesSemestrais,
        percentualParcelas: 30,
      percentualBaloes: 70,
      temSaldoFinal: false,
      saldoFinalTipo: "percentual",
      saldoFinalPercentual: 0,
      saldoFinalValor: 0,
      saldoFinalVencimento,
      saldoFinalForma,
    }),
    [
      entradaPercentual,
      temBalao,
      parcelasMeses,
      baloesSemestrais,
      saldoFinalVencimento,
      saldoFinalForma,
    ]
  );

  const resumoBaseSimulacao = useMemo(
    () =>
      calcularResumoFinanceiro(
        valorTerreno,
        condicaoBaseSimulacao,
        permutaAplicada,
        veiculoAplicado
      ),
    [valorTerreno, condicaoBaseSimulacao, permutaAplicada, veiculoAplicado]
  );

  const valorSaldoFinalCalculado = useMemo(() => {
    const saldoAposEntrada = resumoBaseSimulacao.saldoAposEntrada;

    if (!temSaldoFinal) return 0;

    if (saldoFinalTipo === "percentual") {
      return Math.min(
        Math.max(
          0,
          saldoAposEntrada * (numeroSeguro(saldoFinalPercentual) / 100)
        ),
        saldoAposEntrada
      );
    }

    return Math.min(
      Math.max(0, numeroSeguro(saldoFinalValor)),
      saldoAposEntrada
    );
  }, [
    resumoBaseSimulacao.saldoAposEntrada,
    temSaldoFinal,
    saldoFinalTipo,
    saldoFinalPercentual,
    saldoFinalValor,
  ]);

  const condicaoSimulacao = useMemo<CondicaoPagamento>(
    () =>
      normalizarCondicaoPagamento({
        entradaTipo: "percentual",
        entradaValor: entradaPercentual,
        temBalao,
        parcelasMeses,
        baloesSemestrais,
        percentualParcelas: 30,
      percentualBaloes: 70,
      temSaldoFinal,
      saldoFinalTipo,
      saldoFinalPercentual:
        saldoFinalTipo === "percentual" ? saldoFinalPercentual : 0,
      saldoFinalValor:
        saldoFinalTipo === "valor" ? saldoFinalValor : 0,
      saldoFinalVencimento,
      saldoFinalForma,
    }),
    [
      entradaPercentual,
      temBalao,
      parcelasMeses,
      baloesSemestrais,
      temSaldoFinal,
      saldoFinalTipo,
      saldoFinalPercentual,
      saldoFinalValor,
      saldoFinalVencimento,
      saldoFinalForma,
    ]
  );

  const resumoSimulacao = useMemo(
    () =>
      calcularResumoFinanceiro(
        valorTerreno,
        condicaoSimulacao,
        permutaAplicada,
        veiculoAplicado
      ),
    [valorTerreno, condicaoSimulacao, permutaAplicada, veiculoAplicado]
  );

  const valorEntrada = resumoSimulacao.entrada;
  const saldoFinal = resumoSimulacao.saldoFinal;
  const valorParcela = resumoSimulacao.valorParcela;
  const valorBalao = resumoSimulacao.valorBalao;

  useEffect(() => {
    if (restaurandoContrapropostaRef.current) {
      restaurandoContrapropostaRef.current = false;
      return;
    }

    setContrapropostaBomm((anterior) => ({
      ...anterior,
      valorAprovado: valorTerreno,
      temPermuta,
      permutaAceita: temPermuta
        ? {
            descricao: descricaoPermuta,
            valor: valorPermuta,
          }
        : null,
      temVeiculo,
      veiculoAceito: temVeiculo
        ? {
            descricao: modeloVeiculo,
            valor: valorVeiculo,
          }
        : null,
      condicao: normalizarCondicaoPagamento({
        entradaTipo: "percentual",
        entradaValor: entradaPercentual,
        temBalao,
        parcelasMeses,
        baloesSemestrais,
        percentualParcelas: 30,
        percentualBaloes: 70,
        temSaldoFinal,
        saldoFinalTipo,
        saldoFinalPercentual,
        saldoFinalValor,
        saldoFinalVencimento,
        saldoFinalForma,
      }),
    }));
  }, [
    valorTerreno,
    temPermuta,
    descricaoPermuta,
    valorPermuta,
    temVeiculo,
    modeloVeiculo,
    valorVeiculo,
    entradaPercentual,
    temBalao,
    parcelasMeses,
    baloesSemestrais,
    temSaldoFinal,
    saldoFinalTipo,
    saldoFinalPercentual,
    saldoFinalValor,
    saldoFinalVencimento,
    saldoFinalForma,
  ]);

  const resumoNegociacao = useMemo(() => {
    const partes: string[] = [];

    partes.push(`• Valor total dos terrenos: ${brl(valorTerreno)}`);
    partes.push(`• Entrada (${entradaPercentual}%): ${brl(valorEntrada)}`);

    if (temPermuta && permutaAplicada > 0) {
      partes.push(
        `• Permuta: ${descricaoPermuta || "Permuta informada"} — ${brl(permutaAplicada)}`
      );
    }

    if (temVeiculo && veiculoAplicado > 0) {
      partes.push(
        `• Veículo: ${modeloVeiculo || "Veículo informado"} — ${brl(veiculoAplicado)}`
      );
    }

    if (temSaldoFinal && valorSaldoFinalCalculado > 0) {
      partes.push(
        `• Saldo final na entrega (${saldoFinalTipo === "percentual" ? `${saldoFinalPercentual}%` : "valor informado"}): ${brl(valorSaldoFinalCalculado)}`
      );
      partes.push(`• Vencimento do saldo final: ${saldoFinalVencimento || "2027-09-30"}`);
      partes.push(
        `• Forma prevista do saldo final: ${
          saldoFinalForma === "quitacao"
            ? "quitação"
            : saldoFinalForma === "financiamento"
              ? "financiamento"
              : "a definir"
        }`
      );
    }

    partes.push(`• Base para mensais e balões: ${brl(resumoSimulacao.baseParcelasEBaloes)}`);
    partes.push(`• Saldo remanescente: ${brl(saldoFinal)}`);

    return partes;
  }, [
    valorTerreno,
    entradaPercentual,
    valorEntrada,
    temPermuta,
    permutaAplicada,
    descricaoPermuta,
    temVeiculo,
    veiculoAplicado,
    modeloVeiculo,
    temSaldoFinal,
    saldoFinalTipo,
    saldoFinalPercentual,
    saldoFinalVencimento,
    saldoFinalForma,
    valorSaldoFinalCalculado,
    resumoSimulacao.baseParcelasEBaloes,
    saldoFinal,
  ]);

  const resumoPropostaCliente = useMemo(() => {
    const valorPermutaCliente =
      propostaCliente.temPermuta && propostaCliente.permuta
        ? numeroSeguro(propostaCliente.permuta.valor)
        : 0;

    const valorVeiculoCliente =
      propostaCliente.temVeiculo && propostaCliente.veiculo
        ? numeroSeguro(propostaCliente.veiculo.valor)
        : 0;

    const calculo = calcularResumoFinanceiro(
      numeroSeguro(propostaCliente.valorOfertado),
      propostaCliente.condicao,
      valorPermutaCliente,
      valorVeiculoCliente
    );

    const linhas: string[] = [];
    linhas.push(`• Valor ofertado: ${brl(propostaCliente.valorOfertado)}`);

    if (propostaCliente.condicao.entradaTipo === "percentual") {
      linhas.push(
        `• Entrada (${propostaCliente.condicao.entradaValor}%): ${brl(calculo.entrada)}`
      );
    } else {
      linhas.push(`• Entrada: ${brl(calculo.entrada)}`);
    }

    if (valorPermutaCliente > 0) {
      linhas.push(
        `• Permuta proposta: ${propostaCliente.permuta?.descricao || "Permuta informada"} — ${brl(valorPermutaCliente)}`
      );
    }

    if (valorVeiculoCliente > 0) {
      linhas.push(
        `• Veículo proposto: ${propostaCliente.veiculo?.descricao || "Veículo informado"} — ${brl(valorVeiculoCliente)}`
      );
    }

    if (propostaCliente.condicao.temSaldoFinal && calculo.valorSaldoFinal > 0) {
      linhas.push(
        `• Saldo final na entrega: ${brl(calculo.valorSaldoFinal)} (${propostaCliente.condicao.saldoFinalForma === "quitacao"
          ? "quitação"
          : propostaCliente.condicao.saldoFinalForma === "financiamento"
            ? "financiamento"
            : "a definir"})`
      );
    }

    linhas.push(`• Saldo estimado: ${brl(calculo.saldoFinal)}`);
    linhas.push(
      `• ${propostaCliente.condicao.parcelasMeses} parcelas mensais de ${brl(calculo.valorParcela)}`
    );
    linhas.push(
      descreverFluxoBalao(
        propostaCliente.condicao,
        calculo.valorBalao,
        propostaCliente.balaoTipo
      )
    );

    return {
      linhas,
      calculo,
    };
  }, [propostaCliente]);

  const quadraProposta = useMemo(() => {
    if (!lotesSelecionados.length) return "-";
    return Array.from(
      new Set(lotesSelecionados.map((lote) => String(lote.quadra ?? "-")))
    ).join(", ");
  }, [lotesSelecionados]);

  const loteProposta = useMemo(() => {
    if (!lotesSelecionados.length) return "-";
    return lotesSelecionados.map((lote) => String(lote.lote ?? "-")).join(", ");
  }, [lotesSelecionados]);

  const unidadesSelecionadasPdf = useMemo(() => {
    return lotesSelecionados.map((lote) => ({
      quadra: String(lote.quadra ?? "-"),
      lote: String(lote.lote ?? "-"),
      valor: brl(numeroSeguro(lote.valor)),
    }));
  }, [lotesSelecionados]);

  const valorAprovadoContraproposta = useMemo(() => {
    const valorDigitado = numeroSeguro(contrapropostaBomm.valorAprovado);
    return valorDigitado > 0 ? valorDigitado : valorTerreno;
  }, [contrapropostaBomm.valorAprovado, valorTerreno]);

  const resumoContraproposta = useMemo(() => {
    const valorPermutaBomm =
      contrapropostaBomm.temPermuta && contrapropostaBomm.permutaAceita
        ? numeroSeguro(contrapropostaBomm.permutaAceita.valor)
        : 0;

    const valorVeiculoBomm =
      contrapropostaBomm.temVeiculo && contrapropostaBomm.veiculoAceito
        ? numeroSeguro(contrapropostaBomm.veiculoAceito.valor)
        : 0;

    const calculo = calcularResumoFinanceiro(
      valorAprovadoContraproposta,
      contrapropostaBomm.condicao,
      valorPermutaBomm,
      valorVeiculoBomm
    );

    const linhas: string[] = [];
    linhas.push(`• Valor total dos terrenos: ${brl(valorTerreno)}`);
    linhas.push(`• Valor aprovado: ${brl(valorAprovadoContraproposta)}`);

    if (contrapropostaBomm.condicao.entradaTipo === "percentual") {
      linhas.push(
        `• Entrada (${contrapropostaBomm.condicao.entradaValor}%): ${brl(calculo.entrada)}`
      );
    } else {
      linhas.push(`• Entrada: ${brl(calculo.entrada)}`);
    }

    if (valorPermutaBomm > 0) {
      linhas.push(
        `• Permuta aceita: ${contrapropostaBomm.permutaAceita?.descricao || "Permuta informada"} — ${brl(valorPermutaBomm)}`
      );
    }

    if (valorVeiculoBomm > 0) {
      linhas.push(
        `• Veículo aceito: ${contrapropostaBomm.veiculoAceito?.descricao || "Veículo informado"} — ${brl(valorVeiculoBomm)}`
      );
    }

    if (contrapropostaBomm.condicao.temSaldoFinal && calculo.valorSaldoFinal > 0) {
      linhas.push(
        `• Saldo final na entrega: ${brl(calculo.valorSaldoFinal)} (${contrapropostaBomm.condicao.saldoFinalForma === "quitacao"
          ? "quitação"
          : contrapropostaBomm.condicao.saldoFinalForma === "financiamento"
            ? "financiamento"
            : "a definir"})`
      );
    }

    linhas.push(`• Saldo remanescente: ${brl(calculo.saldoFinal)}`);
    linhas.push(
      `• ${contrapropostaBomm.condicao.parcelasMeses} parcelas mensais de ${brl(calculo.valorParcela)}`
    );
    linhas.push(
      descreverFluxoBalao(
        contrapropostaBomm.condicao,
        calculo.valorBalao
      )
    );

    if (contrapropostaBomm.validade) {
      linhas.push(`• Validade: ${contrapropostaBomm.validade}`);
    }

    return {
      linhas,
      calculo,
    };
  }, [contrapropostaBomm, valorAprovadoContraproposta, valorTerreno]);

  const mensagemWhatsApp = useMemo(() => {
    const linhas: string[] = [];

    if (modoDocumento === "simulacao") {
      linhas.push(`Olá, ${cliente || "Cliente"}!`);
      linhas.push("");
      linhas.push(
        "Preparei uma simulação personalizada do Vivendas do Bosque pra você ter uma visão clara de como fica o fluxo financeiro:"
      );
      linhas.push("");
      linhas.push("🏡 Unidades:");

      if (lotesSelecionados.length > 0) {
        lotesSelecionados.forEach((lote) => {
          linhas.push(`• Quadra ${lote.quadra} • Lote ${lote.lote}`);
        });
      } else {
        linhas.push("• Nenhuma unidade selecionada");
      }

      linhas.push("");
      linhas.push("💰 Valores:");
      linhas.push(`• Valor total dos terrenos: ${brl(valorTerreno)}`);
      linhas.push(`• Entrada (${entradaPercentual}%): ${brl(valorEntrada)}`);

      if (temPermuta && permutaAplicada > 0) {
        linhas.push(
          `• Permuta: ${descricaoPermuta || "Permuta informada"} — ${brl(permutaAplicada)}`
        );
      }

      if (temVeiculo && veiculoAplicado > 0) {
        linhas.push(
          `• Veículo: ${modeloVeiculo || "Veículo informado"} — ${brl(veiculoAplicado)}`
        );
      }

      if (temSaldoFinal && valorSaldoFinalCalculado > 0) {
        linhas.push(
          `• Saldo final na entrega: ${brl(valorSaldoFinalCalculado)}`
        );
        linhas.push(
          `• Vencimento previsto: ${saldoFinalVencimento || "2027-09-30"}`
        );
        linhas.push(
          `• Forma prevista: ${
            saldoFinalForma === "quitacao"
              ? "quitação"
              : saldoFinalForma === "financiamento"
                ? "financiamento"
                : "a definir"
          }`
        );
      }

      linhas.push(`• Saldo remanescente: ${brl(saldoFinal)}`);
      linhas.push("");
      linhas.push("📋 Condição sugerida:");
      linhas.push(`• ${parcelasMeses} parcelas mensais de ${brl(valorParcela)}`);
      linhas.push(descreverFluxoBalao(condicaoSimulacao, valorBalao));
      linhas.push("");
      linhas.push(
        "📌 Importante: parcelas e balões são corrigidos pelo INCC durante a obra e, após a entrega, pelo IPCA."
      );
    }

    if (modoDocumento === "proposta") {
      linhas.push(`Belgio, proposta recebida para análise:`);
      linhas.push("");
      linhas.push(`Cliente: ${cliente || "-"}`);
      linhas.push(`Corretor(a): ${corretor || "-"}`);
      linhas.push(`Imobiliária: ${imobiliaria || "-"}`);
      linhas.push("");
      linhas.push("🏡 Unidades:");

      if (lotesSelecionados.length > 0) {
        lotesSelecionados.forEach((lote) => {
          linhas.push(`• Quadra ${lote.quadra} • Lote ${lote.lote}`);
        });
      } else {
        linhas.push("• Nenhuma unidade selecionada");
      }

      linhas.push("");
      linhas.push("📋 Estrutura da proposta do cliente:");
      resumoPropostaCliente.linhas.forEach((linha) => linhas.push(linha));

      if (propostaCliente.observacoes) {
        linhas.push("");
        linhas.push(`Observações: ${propostaCliente.observacoes}`);
      }

      linhas.push("");
      linhas.push(
        "📌 Condição sujeita à validação comercial e financeira da incorporadora."
      );
    }

    if (modoDocumento === "contraproposta") {
      linhas.push(`Olá, ${cliente || "Nome"}!`);
      linhas.push("");
      linhas.push(
        "Segue a contraproposta estruturada para sua análise no Vivendas do Bosque:"
      );
      linhas.push("");
      linhas.push("🏡 Unidades:");

      if (lotesSelecionados.length > 0) {
        lotesSelecionados.forEach((lote) => {
          linhas.push(`• Quadra ${lote.quadra} • Lote ${lote.lote}`);
        });
      } else {
        linhas.push("• Nenhuma unidade selecionada");
      }

      linhas.push("");
      linhas.push("📋 Condição aprovada:");
      resumoContraproposta.linhas.forEach((linha) => linhas.push(linha));

      if (contrapropostaBomm.observacoes) {
        linhas.push("");
        linhas.push(`Observações comerciais: ${contrapropostaBomm.observacoes}`);
      }

      linhas.push("");
      linhas.push(
        "📌 Importante: parcelas e balões são corrigidos pelo INCC durante a obra e, após a entrega, pelo IPCA."
      );
    }

    if (corretor || imobiliaria) {
      linhas.push("");
      linhas.push("👤 Atendimento:");
      if (corretor) linhas.push(`• Corretor(a): ${corretor}`);
      if (imobiliaria) linhas.push(`• Imobiliária: ${imobiliaria}`);
    }

    return linhas.join("\n");
  }, [
    modoDocumento,
    cliente,
    corretor,
    imobiliaria,
    lotesSelecionados,
    valorTerreno,
    entradaPercentual,
    valorEntrada,
    temPermuta,
    permutaAplicada,
    descricaoPermuta,
    temVeiculo,
    veiculoAplicado,
    modeloVeiculo,
    temSaldoFinal,
    valorSaldoFinalCalculado,
    saldoFinalVencimento,
    saldoFinalForma,
    saldoFinal,
    parcelasMeses,
    valorParcela,
    baloesSemestrais,
    valorBalao,
    resumoPropostaCliente,
    propostaCliente.observacoes,
    resumoContraproposta,
    contrapropostaBomm.observacoes,
  ]);

  function mostrarFeedbackNegociacao(texto: string) {
    setFeedbackNegociacao(texto);
    window.setTimeout(() => setFeedbackNegociacao(""), 2400);
  }

  async function recarregarNegociacoes() {
    setNegociacoesSalvas(await listNegociacoes());
  }

  async function sincronizarNegociacaoNoCrm(
    tipo: ModoDocumento,
    options?: { gerarPdfDepois?: boolean }
  ) {
    const negociacaoAtual = negociacaoAtivaId
      ? negociacoesSalvas.find((negociacao) => negociacao.id === negociacaoAtivaId)
      : null;

    const configuracao =
      tipo === "proposta"
        ? {
            ultimaAcao: "Proposta gerada e salva no CRM",
            descricaoEvento: "Proposta gerada e salva no CRM",
            mensagemCriada: "Proposta salva no CRM.",
            mensagemAtualizada: "Proposta atualizada no CRM.",
          }
        : tipo === "contraproposta"
          ? {
              ultimaAcao: "Contraproposta gerada e salva no CRM",
              descricaoEvento: "Contraproposta gerada e salva no CRM",
              mensagemCriada: "Contraproposta salva no CRM.",
              mensagemAtualizada: "Contraproposta atualizada no CRM.",
            }
          : {
              ultimaAcao: "Simulação salva no CRM",
              descricaoEvento: "Simulação salva no CRM",
              mensagemCriada: "Simulação salva no CRM.",
              mensagemAtualizada: "Negociação atualizada a partir do simulador.",
            };

    const base = mapearSimuladorParaNegociacaoSalva({
      tipo,
      clienteId: clienteSelecionadoId || null,
      cliente,
      clienteCpf,
      clienteTelefone,
      clienteEmail,
      clienteProfissao,
      clienteEstadoCivil,
      corretorId: corretorSelecionadoId || null,
      corretor,
      creci,
      imobiliaria,
      lotesSelecionados,
      valorTotal: valorTerreno,
      simulacao: {
        entradaPercentual,
        temBalao,
        parcelasMeses,
        baloesSemestrais,
        temSaldoFinal,
        saldoFinalTipo,
        saldoFinalPercentual,
        saldoFinalValor,
        saldoFinalVencimento,
        saldoFinalForma,
        temPermuta,
        permuta: temPermuta
          ? {
              descricao: descricaoPermuta,
              valor: valorPermuta,
            }
          : null,
        temVeiculo,
        veiculo: temVeiculo
          ? {
              descricao: modeloVeiculo,
              valor: valorVeiculo,
            }
          : null,
      },
      proposta: {
        ...propostaCliente,
        condicao: normalizarCondicaoPagamento(propostaCliente.condicao),
      },
      contraproposta: {
        ...contrapropostaBomm,
        condicao: normalizarCondicaoPagamento(contrapropostaBomm.condicao),
      },
    });

    const negociacao = {
      ...prepararNegociacaoParaCrm({
        base,
        tipo,
        negociacaoAtual,
        ultimaAcao: configuracao.ultimaAcao,
      }),
      consultoraId: profile?.id ?? null,
      consultoraNome: profile?.nomeExibicao ?? profile?.nome ?? "",
    };

    let negociacaoPersistida: NegociacaoSalva | null = null;

    if (negociacaoAtual && negociacaoAtivaId) {
      const atualizada = await updateNegociacaoById(negociacaoAtivaId, negociacao, [
        {
          tipo: "negociacao_atualizada",
          descricao: "Negociação atualizada a partir do simulador",
        },
        {
          tipo: "negociacao_atualizada",
          descricao: configuracao.descricaoEvento,
        },
      ]);

      if (atualizada) {
        negociacaoPersistida = atualizada;
        setNegociacaoAtivaId(atualizada.id);
        await recarregarNegociacoes();
        mostrarFeedbackNegociacao(configuracao.mensagemAtualizada);
      }
    } else {
      const criada = await createNegociacao(negociacao, [
        {
          tipo: "negociacao_atualizada",
          descricao: configuracao.descricaoEvento,
        },
      ]);
      negociacaoPersistida = criada;
      setNegociacaoAtivaId(criada.id);
      await recarregarNegociacoes();
      mostrarFeedbackNegociacao(configuracao.mensagemCriada);
    }

    if (options?.gerarPdfDepois) {
        gerarPdf();
        if (negociacaoPersistida) {
        await appendNegociacaoEvent(negociacaoPersistida.id, {
          tipo: "pdf_gerado",
          descricao: "PDF gerado",
        });
        await recarregarNegociacoes();
      }
    }
  }

  async function abrirNegociacaoSalva(negociacao: NegociacaoSalva) {
    const restaurada = reidratarNegociacaoSalva(negociacao);
    restaurandoContrapropostaRef.current = true;

    setModoDocumento(restaurada.tipo);
    setClienteSelecionadoId(restaurada.clienteId || "");
    setCliente(restaurada.cliente);
    setClienteCpf(restaurada.clienteCpf);
    setClienteTelefone(restaurada.clienteTelefone);
    setClienteEmail(restaurada.clienteEmail);
    setClienteProfissao(restaurada.clienteProfissao);
    setClienteEstadoCivil(restaurada.clienteEstadoCivil);
    setCorretorSelecionadoId(restaurada.corretorId || "");
    setCorretor(restaurada.corretor);
    setCreci(restaurada.creci);
    setImobiliaria(restaurada.imobiliaria);
    setLotesSelecionados(restaurada.lotesSelecionados);

    setEntradaPercentual(restaurada.simulacao.entradaPercentual);
    setTemBalao(restaurada.simulacao.temBalao);
    setParcelasMeses(Math.max(1, restaurada.simulacao.parcelasMeses));
    setBaloesSemestrais(restaurada.simulacao.baloesSemestrais);
    setTemSaldoFinal(restaurada.simulacao.temSaldoFinal);
    setSaldoFinalTipo(restaurada.simulacao.saldoFinalTipo);
    setSaldoFinalPercentual(restaurada.simulacao.saldoFinalPercentual);
    setSaldoFinalValor(restaurada.simulacao.saldoFinalValor);
    setSaldoFinalVencimento(restaurada.simulacao.saldoFinalVencimento);
    setSaldoFinalForma(restaurada.simulacao.saldoFinalForma);
    setTemPermuta(restaurada.simulacao.temPermuta);
    setDescricaoPermuta(restaurada.simulacao.permuta?.descricao || "");
    setValorPermuta(numeroSeguro(restaurada.simulacao.permuta?.valor));
    setTemVeiculo(restaurada.simulacao.temVeiculo);
    setModeloVeiculo(restaurada.simulacao.veiculo?.descricao || "");
    setValorVeiculo(numeroSeguro(restaurada.simulacao.veiculo?.valor));

    setPropostaCliente({
      ...restaurada.proposta,
      condicao: normalizarCondicaoPagamento(restaurada.proposta.condicao),
    });
    setContrapropostaBomm({
      ...restaurada.contraproposta,
      condicao: normalizarCondicaoPagamento(restaurada.contraproposta.condicao),
    });
    setNegociacaoAtivaId(negociacao.id);
    await appendNegociacaoEvent(negociacao.id, {
      tipo: "negociacao_aberta",
      descricao: "Negociação aberta",
    });
    await recarregarNegociacoes();
    mostrarFeedbackNegociacao("Negociação aberta no simulador.");
  }

  useEffect(() => {
    if (loading) return;

    async function abrirAgendada() {
      const negociacaoId = consumirNegociacaoAgendada();
      if (!negociacaoId) return;

      const negociacao = await getNegociacaoById(negociacaoId);
      if (negociacao) {
        await abrirNegociacaoSalva(negociacao);
      }
    }

    void abrirAgendada();
  }, [loading]);

  async function copiarMensagem() {
    try {
      await navigator.clipboard.writeText(mensagemWhatsApp);
      setCopiado(true);
      window.setTimeout(() => setCopiado(false), 1800);
    } catch (e) {
      console.error(e);
    }
  }

  function gerarPdf() {
    if (modoDocumento === "proposta") {
      const dataPdf = propostaCliente.data || dataAtualInput();
      const detalhesNegociacao = resumoPropostaCliente.linhas.filter(
        (linha) => !linha.trim().toLowerCase().startsWith("observa")
      );

      gerarPdfProposta({
        data: dataPdf,
        quadra: quadraProposta,
        lote: loteProposta,
        valor: brl(valorTerreno),
        clienteNome: cliente || "-",
        clienteCpf: clienteCpf || "-",
        clienteTelefone: clienteTelefone || "-",
        clienteEmail: clienteEmail || "-",
        clienteProfissao: clienteProfissao || "-",
        clienteEstadoCivil: clienteEstadoCivil || "-",
        corretor: corretor || "-",
        creci: creci || "-",
        imobiliaria: imobiliaria || "-",
        entrada: {
          valor: brl(resumoPropostaCliente.calculo.entrada),
          quantidadeParcelas: String(propostaCliente.entradaQuantidadeParcelas || 1),
          valorParcela: brl(
            (propostaCliente.entradaQuantidadeParcelas || 1) > 0
              ? resumoPropostaCliente.calculo.entrada /
                  (propostaCliente.entradaQuantidadeParcelas || 1)
              : resumoPropostaCliente.calculo.entrada
          ),
          primeiroVencimento: propostaCliente.entradaPrimeiroVencimento || "-",
        },
        mensais: {
          quantidadeParcelas: String(propostaCliente.condicao.parcelasMeses),
          valorParcela: brl(resumoPropostaCliente.calculo.valorParcela),
          primeiroVencimento: propostaCliente.mensaisPrimeiroVencimento || "-",
        },
        balao: condicaoTemBalao(propostaCliente.condicao)
          ? {
              tipo: propostaCliente.balaoTipo,
              quantidadeParcelas: String(propostaCliente.condicao.baloesSemestrais),
              valorParcela: brl(resumoPropostaCliente.calculo.valorBalao),
              primeiroVencimento: propostaCliente.balaoPrimeiroVencimento || "-",
            }
          : undefined,
        permuta: propostaCliente.temPermuta
          ? {
              valor: brl(numeroSeguro(propostaCliente.permuta?.valor)),
              descricao: propostaCliente.permuta?.descricao || "-",
            }
          : undefined,
        observacao: propostaCliente.observacoes || "-",
        unidades: unidadesSelecionadasPdf,
        detalhesNegociacao,
      });
      return;
    }

    if (modoDocumento === "contraproposta") {
      gerarPdfContraproposta({
        data: dataAtualInput(),
        quadra: quadraProposta,
        lote: loteProposta,
        valor: brl(valorTerreno),
        clienteNome: cliente || "-",
        clienteCpf: clienteCpf || "-",
        clienteTelefone: clienteTelefone || "-",
        clienteEmail: clienteEmail || "-",
        clienteProfissao: clienteProfissao || "-",
        clienteEstadoCivil: clienteEstadoCivil || "-",
        corretor: corretor || "-",
        creci: creci || "-",
        imobiliaria: imobiliaria || "-",
        unidades: unidadesSelecionadasPdf,
        condicaoAprovada: {
          valor: brl(valorAprovadoContraproposta),
          entrada:
            contrapropostaBomm.condicao.entradaTipo === "percentual"
              ? `${contrapropostaBomm.condicao.entradaValor}% (${brl(resumoContraproposta.calculo.entrada)})`
              : brl(resumoContraproposta.calculo.entrada),
          mensaisQuantidade: `${contrapropostaBomm.condicao.parcelasMeses}x`,
          mensaisValor: brl(resumoContraproposta.calculo.valorParcela),
          balaoTipo: condicaoTemBalao(contrapropostaBomm.condicao)
            ? "semestral"
            : undefined,
          balaoQuantidade: condicaoTemBalao(contrapropostaBomm.condicao)
            ? `${contrapropostaBomm.condicao.baloesSemestrais}x`
            : undefined,
          balaoValor: condicaoTemBalao(contrapropostaBomm.condicao)
            ? brl(resumoContraproposta.calculo.valorBalao)
            : undefined,
          validade: contrapropostaBomm.validade || "-",
        },
        permuta: contrapropostaBomm.temPermuta
          ? {
              valor: brl(numeroSeguro(contrapropostaBomm.permutaAceita?.valor)),
              descricao: contrapropostaBomm.permutaAceita?.descricao || "-",
            }
          : undefined,
        observacao: contrapropostaBomm.observacoes || "-",
        detalhesNegociacao: resumoContraproposta.linhas.filter(
          (linha) => !linha.trim().toLowerCase().startsWith("observa")
        ),
      });
      return;
    }

    gerarPdfSimulacao({
      data: dataAtualInput(),
      quadra: quadraProposta,
      lote: loteProposta,
      valor: brl(valorTerreno),
      clienteNome: cliente || "-",
      clienteCpf: clienteCpf || "-",
      clienteTelefone: clienteTelefone || "-",
      clienteEmail: clienteEmail || "-",
      clienteProfissao: clienteProfissao || "-",
      clienteEstadoCivil: clienteEstadoCivil || "-",
      corretor: corretor || "-",
      creci: creci || "-",
      imobiliaria: imobiliaria || "-",
      unidades: unidadesSelecionadasPdf,
      entrada: brl(valorEntrada),
      saldoFinal:
        temSaldoFinal && valorSaldoFinalCalculado > 0
          ? {
              valor: brl(valorSaldoFinalCalculado),
              vencimento: saldoFinalVencimento || "2027-09-30",
              forma:
                saldoFinalForma === "quitacao"
                  ? "quitação"
                  : saldoFinalForma === "financiamento"
                    ? "financiamento"
                    : "a definir",
            }
          : undefined,
      permuta:
        temPermuta && permutaAplicada > 0
          ? {
              valor: brl(permutaAplicada),
              descricao: descricaoPermuta || "Permuta informada",
            }
          : undefined,
      veiculo:
        temVeiculo && veiculoAplicado > 0
          ? {
              valor: brl(veiculoAplicado),
              descricao: modeloVeiculo || "Veículo informado",
            }
          : undefined,
      mensais: {
        quantidadeParcelas: `${parcelasMeses} parcelas`,
        valorParcela: brl(valorParcela),
      },
      balao: condicaoTemBalao(condicaoSimulacao)
        ? {
            tipo: "Semestral",
            quantidadeParcelas: `${baloesSemestrais} parcelas`,
            valorParcela: brl(valorBalao),
          }
        : undefined,
      baseParcelasEBaloes: brl(resumoSimulacao.baseParcelasEBaloes),
      saldoRemanescente: brl(saldoFinal),
      detalhesNegociacao: [
        ...resumoNegociacao,
        `• ${parcelasMeses} parcelas mensais de ${brl(valorParcela)}`,
        descreverFluxoBalao(condicaoSimulacao, valorBalao),
      ],
      observacao:
        "Condição comercial sujeita à disponibilidade das unidades e validação na data da negociação.",
    });
  }

  const tituloModo =
    modoDocumento === "simulacao"
      ? "Nova simulação"
      : modoDocumento === "proposta"
        ? "Nova proposta"
        : "Nova contra-proposta";

  const descricaoModo =
    modoDocumento === "simulacao"
      ? "Monte uma simulação comercial com clareza e rapidez."
      : modoDocumento === "proposta"
        ? "Registre a proposta recebida do cliente com organização."
        : "Compare a proposta do cliente com a condição aprovada pela BOMM.";

  const etapaAtual = useMemo(() => {
    if (modoDocumento === "simulacao") {
      if (!cliente.trim() && !quantidadeLotesSelecionados) return 1;
      if (!quantidadeLotesSelecionados) return 2;
      if (!mensagemWhatsApp.trim()) return 3;
      return 4;
    }

    if (!cliente.trim()) return 1;
    if (!quantidadeLotesSelecionados) return 2;
    if (
      modoDocumento === "proposta" &&
      numeroSeguro(propostaCliente.valorOfertado) <= 0 &&
      !propostaCliente.observacoes.trim()
    ) {
      return 3;
    }
    if (
      modoDocumento === "contraproposta" &&
      numeroSeguro(contrapropostaBomm.valorAprovado) <= 0 &&
      !contrapropostaBomm.observacoes.trim()
    ) {
      return 3;
    }
    return 4;
  }, [
    modoDocumento,
    cliente,
    quantidadeLotesSelecionados,
    mensagemWhatsApp,
    propostaCliente.valorOfertado,
    propostaCliente.observacoes,
    contrapropostaBomm.valorAprovado,
    contrapropostaBomm.observacoes,
  ]);

  const stepItems = useMemo(() => {
    if (modoDocumento === "proposta") {
      return [
        {
          id: 1,
          eyebrow: "Passo 1",
          title: "Contexto e cliente",
          description: "Defina o atendimento e identifique o proponente.",
        },
        {
          id: 2,
          eyebrow: "Passo 2",
          title: "Unidades e origem",
          description: "Selecione os lotes e registre os dados do corretor.",
        },
        {
          id: 3,
          eyebrow: "Passo 3",
          title: "Condição proposta",
          description: "Monte a proposta comercial e os ativos envolvidos.",
        },
        {
          id: 4,
          eyebrow: "Passo 4",
          title: "Saída institucional",
          description: "Revise o texto final e gere o PDF da proposta.",
        },
      ];
    }

    if (modoDocumento === "contraproposta") {
      return [
        {
          id: 1,
          eyebrow: "Passo 1",
          title: "Contexto e cliente",
          description: "Defina o atendimento e identifique o comprador.",
        },
        {
          id: 2,
          eyebrow: "Passo 2",
          title: "Unidades e intermediação",
          description: "Selecione os lotes e registre corretor e imobiliária.",
        },
        {
          id: 3,
          eyebrow: "Passo 3",
          title: "Condição aprovada",
          description: "Estruture a resposta da BOMM com validade e ativos.",
        },
        {
          id: 4,
          eyebrow: "Passo 4",
          title: "Saída institucional",
          description: "Revise o comparativo e gere o PDF final.",
        },
      ];
    }

    return [
      {
        id: 1,
        eyebrow: "Passo 1",
        title: "Modo e cliente",
        description: "Defina o documento e o contexto do atendimento.",
      },
      {
        id: 2,
        eyebrow: "Passo 2",
        title: "Lotes e ativos",
        description: "Selecione unidades e abatimentos do negócio.",
      },
      {
        id: 3,
        eyebrow: "Passo 3",
        title: "Condição financeira",
        description: "Estruture entrada, saldo final, mensais e balões.",
      },
      {
        id: 4,
        eyebrow: "Passo 4",
        title: "Saída final",
        description: "Revise a narrativa e gere mensagem ou PDF.",
      },
    ];
  }, [modoDocumento]);

  const flowItems = useMemo(
    () => [
      {
        label: "Valor total",
        value: brl(valorTerreno),
        hint: `${quantidadeLotesSelecionados} lote(s) selecionado(s)`,
        tone: "isPrimary",
      },
      {
        label: "Entrada",
        value: brl(valorEntrada),
        hint: `${entradaPercentual}% do valor do negócio`,
        tone: "isPrimary",
      },
      {
        label: "Saldo final",
        value: temSaldoFinal ? brl(valorSaldoFinalCalculado) : "Não aplicado",
        hint: temSaldoFinal
          ? `${saldoFinalTipo === "percentual" ? `${saldoFinalPercentual}%` : "valor livre"} • ${saldoFinalVencimento || "2027-09-30"}`
          : "Opcional na entrega do condomínio",
        tone: temSaldoFinal ? "isAccent" : "isMuted",
      },
      {
        label: "Permuta",
        value: temPermuta && permutaAplicada > 0 ? brl(permutaAplicada) : "Não aplicada",
        hint: temPermuta ? descricaoPermuta || "Permuta informada" : "Sem abatimento",
        tone: temPermuta && permutaAplicada > 0 ? "isApplied" : "isMuted",
      },
      {
        label: "Veículo",
        value: temVeiculo && veiculoAplicado > 0 ? brl(veiculoAplicado) : "Não aplicado",
        hint: temVeiculo ? modeloVeiculo || "Veículo informado" : "Sem abatimento",
        tone: temVeiculo && veiculoAplicado > 0 ? "isApplied" : "isMuted",
      },
      {
        label: "Base p/ mensais e balões",
        value: brl(resumoSimulacao.baseParcelasEBaloes),
        hint: condicaoTemBalao(condicaoSimulacao)
          ? `${parcelasMeses} mensais • ${baloesSemestrais} balões`
          : `${parcelasMeses} mensais • fluxo sem balão`,
        tone: "isFinal",
      },
    ],
    [
      valorTerreno,
      quantidadeLotesSelecionados,
      valorEntrada,
      entradaPercentual,
      temSaldoFinal,
      valorSaldoFinalCalculado,
      saldoFinalTipo,
      saldoFinalPercentual,
      saldoFinalVencimento,
      temPermuta,
      permutaAplicada,
      descricaoPermuta,
      temVeiculo,
      veiculoAplicado,
      modeloVeiculo,
      resumoSimulacao.baseParcelasEBaloes,
      parcelasMeses,
      baloesSemestrais,
      condicaoSimulacao,
    ]
  );

  const lotesSelecionadosResumo = useMemo(
    () =>
      lotesSelecionados.map((lote) => ({
        key: chaveLote(lote),
        label: `Q${lote.quadra} • L${lote.lote}`,
      })),
    [lotesSelecionados]
  );

  const painelApoioTitulo =
    modoDocumento === "simulacao"
      ? "Mensagem e ações"
      : modoDocumento === "proposta"
        ? "Fechamento da proposta"
        : "Fechamento da contraproposta";

  const painelApoioDescricao =
    modoDocumento === "simulacao"
      ? "Revise a mensagem comercial, copie o texto, sincronize a simulação no CRM e gere o PDF sem competir com o formulário principal."
      : modoDocumento === "proposta"
        ? "Conclua a proposta com uma área dedicada para mensagem, PDF e sincronização comercial."
        : "Consolide a contraproposta com revisão textual, PDF institucional e registro no CRM.";

  const painelApoioRodape =
    modoDocumento === "simulacao"
      ? "Pronto para copiar, salvar no CRM e gerar PDF a partir da mesma negociação."
      : "Fluxo final preparado para sincronização da negociação, mensagem e PDF institucional.";

  return (
    <div className="simPage">
      <div className="luxWrap">
        <main className="luxMain">
          {erro ? <div className="alert alertDanger">{erro}</div> : null}

          <section className="luxHero">
            {branding.mostrarLogoClienteNoSimulador && branding.clienteLogoUrl ? (
              <img
                src={branding.clienteLogoUrl}
                alt={branding.clienteNome}
                style={{ height: 40, objectFit: "contain", marginBottom: 8 }}
              />
            ) : null}
            <div className="luxHeroKicker">{tituloModo}</div>
            <h1 className="luxTitle">Dados do Cliente</h1>
            <p className="luxHeroText">{descricaoModo}</p>
          </section>

          <section className="luxStepBar" aria-label="Etapas do fluxo">
            {stepItems.map((step) => {
              const status =
                step.id < etapaAtual ? "isDone" : step.id === etapaAtual ? "isActive" : "";

              return (
                <div key={step.id} className={["luxStep", status].join(" ").trim()}>
                  <div className="luxStepIndex">{step.id}</div>
                  <div className="luxStepBody">
                    <div className="luxStepEyebrow">{step.eyebrow}</div>
                    <div className="luxStepTitle">{step.title}</div>
                    <div className="luxStepText">{step.description}</div>
                  </div>
                </div>
              );
            })}
          </section>

          <div className="luxWorkspace">
            <div className="luxContent">

          <section className="luxSection">
            <div className="luxSectionInner">
              <div className="luxKicker">Modo de trabalho</div>
              <h2 className="luxH2">Tipo de documento</h2>

              <div className="luxActions">
                <button
                  type="button"
                  className={`btn ${modoDocumento === "simulacao" ? "" : "btnGhost"}`}
                  onClick={() => setModoDocumento("simulacao")}
                >
                  Simulação
                </button>

                <button
                  type="button"
                  className={`btn ${modoDocumento === "proposta" ? "" : "btnGhost"}`}
                  onClick={() => setModoDocumento("proposta")}
                >
                  Proposta
                </button>

                <button
                  type="button"
                  className={`btn ${modoDocumento === "contraproposta" ? "" : "btnGhost"}`}
                  onClick={() => setModoDocumento("contraproposta")}
                >
                  Contra-proposta
                </button>
              </div>

              <div className="luxNote" style={{ marginTop: 16 }}>
                <strong>Modo atual:</strong>{" "}
                {modoDocumento === "simulacao"
                  ? "Simulação"
                  : modoDocumento === "proposta"
                    ? "Proposta"
                    : "Contraproposta"}
              </div>
            </div>
          </section>

          <section className="luxSection">
            <div className="luxSectionInner">
              <div className="luxGrid2">
                <div className="luxField">
                  <label>Cliente cadastrado</label>
                  <select
                    value={clienteSelecionadoId}
                    onChange={(e) => {
                      const nextId = e.target.value;
                      setClienteSelecionadoId(nextId);
                      aplicarClienteVinculado(
                        clientesCadastrados.find((item) => item.id === nextId) || null
                      );
                    }}
                  >
                    <option value="">Preencher manualmente</option>
                    {clientesCadastrados.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.nome}
                      </option>
                    ))}
                  </select>
                  <div className="mini">
                    {clienteSelecionado
                      ? `Vinculado ao CRM: ${clienteSelecionado.nome}`
                      : "Sem cliente vinculado. Você pode preencher os dados manualmente."}
                  </div>
                </div>

                <div className="luxField">
                  <label>Corretor cadastrado</label>
                  <select
                    value={corretorSelecionadoId}
                    onChange={(e) => {
                      const nextId = e.target.value;
                      setCorretorSelecionadoId(nextId);
                      aplicarCorretorVinculado(
                        corretoresCadastrados.find((item) => item.id === nextId) || null
                      );
                    }}
                  >
                    <option value="">Preencher manualmente</option>
                    {corretoresCadastrados.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.nome}
                      </option>
                    ))}
                  </select>
                  <div className="mini">
                    {corretorSelecionado
                      ? `Vinculado ao CRM: ${corretorSelecionado.nome}`
                      : "Sem corretor vinculado. O atendimento pode seguir com preenchimento manual."}
                  </div>
                </div>
              </div>

              <div className="luxSpacer" />

              <div className="luxGrid3">
                <div className="luxField">
                  <label>Data</label>
                  <input
                    type="date"
                    value={propostaCliente.data}
                    onChange={(e) =>
                      setPropostaCliente((anterior) => ({
                        ...anterior,
                        data: e.target.value,
                      }))
                    }
                  />
                </div>

                <div className="luxField">
                  <label>Cliente</label>
                  <input
                    value={cliente}
                    onChange={(e) => setCliente(e.target.value)}
                    placeholder="Nome do cliente"
                  />
                </div>

                <div className="luxField">
                  <label>CPF</label>
                  <input
                    value={clienteCpf}
                    onChange={(e) => setClienteCpf(e.target.value)}
                    placeholder="CPF do cliente"
                  />
                </div>
              </div>

              <div className="luxSpacer" />

              <div className="luxGrid3">
                <div className="luxField">
                  <label>Telefone</label>
                  <input
                    value={clienteTelefone}
                    onChange={(e) => setClienteTelefone(e.target.value)}
                    placeholder="Telefone do cliente"
                  />
                </div>

                <div className="luxField">
                  <label>Email</label>
                  <input
                    value={clienteEmail}
                    onChange={(e) => setClienteEmail(e.target.value)}
                    placeholder="Email do cliente"
                  />
                </div>

                <div className="luxField">
                  <label>Profissão</label>
                  <input
                    value={clienteProfissao}
                    onChange={(e) => setClienteProfissao(e.target.value)}
                    placeholder="Profissão do cliente"
                  />
                </div>
              </div>

              <div className="luxSpacer" />

              <div className="luxGrid3">
                <div className="luxField">
                  <label>Estado civil</label>
                  <input
                    value={clienteEstadoCivil}
                    onChange={(e) => setClienteEstadoCivil(e.target.value)}
                    placeholder="Estado civil"
                  />
                </div>

                <div className="luxField">
                  <label>Corretor(a)</label>
                  <input
                    value={corretor}
                    onChange={(e) => setCorretor(e.target.value)}
                    placeholder="Nome do corretor"
                  />
                </div>

                <div className="luxField">
                  <label>CRECI</label>
                  <input
                    value={creci}
                    onChange={(e) => setCreci(e.target.value)}
                    placeholder="CRECI do corretor"
                  />
                </div>
              </div>

              <div className="luxSpacer" />

              <div className="luxField">
                <label>Imobiliária</label>
                <input
                  value={imobiliaria}
                  onChange={(e) => setImobiliaria(e.target.value)}
                  placeholder="Ex: Inova Imobiliária"
                />
              </div>

              <div className="luxDivider" />

              <div className="luxLotExplorer">
                <div className="luxLotControls">
                  <div className="luxGrid2 luxLotFilters">
                    <div className="luxField">
                      <label>Quadra</label>
                      <select
                        value={quadraFiltro}
                        onChange={(e) => {
                          setQuadraFiltro(e.target.value);
                          setLoteFiltro("");
                        }}
                      >
                        <option value="">Todas</option>
                        {quadras.map((quadra) => (
                          <option key={quadra} value={quadra}>
                            {quadra}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="luxField">
                      <label>Lote</label>
                      <select
                        value={loteFiltro}
                        onChange={(e) => setLoteFiltro(e.target.value)}
                      >
                        <option value="">Todos</option>
                        {lotesDaQuadra.map((lote) => (
                          <option key={lote} value={lote}>
                            {lote}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="luxField">
                      <label>Buscar lote</label>
                      <input
                        value={busca}
                        onChange={(e) => setBusca(e.target.value)}
                        placeholder='Ex: "Q1 L8"'
                      />
                    </div>

                    <div className="luxField">
                      <label>Status</label>
                      <select
                        value={statusFiltro}
                        onChange={(e) => setStatusFiltro(e.target.value as StatusFiltro)}
                      >
                        <option value="todos">Todos</option>
                        <option value="disponivel">Disponíveis</option>
                        <option value="indisponivel">Indisponíveis</option>
                      </select>
                    </div>
                  </div>

                  <div className="luxMeta">
                    <span>Lotes carregados: {lotes.length}</span>
                    <span className="luxMetaDot">•</span>
                    <span>Lotes selecionados: {quantidadeLotesSelecionados}</span>
                    <span className="luxMetaDot">•</span>
                    <span>{unidadesSelecionadasTexto}</span>
                  </div>
                </div>

                <div className="luxLotListCard">
                  <div className="luxLockRow">
                    <label className="luxToggle">
                      <input
                        type="checkbox"
                        checked={travarIndisponiveis}
                        onChange={(e) => setTravarIndisponiveis(e.target.checked)}
                      />
                      Travar lotes indisponíveis
                    </label>
                  </div>

                  <div className="luxLotListHead">
                    <div className="luxLotListTitle">Lista de lotes</div>
                    <div className="luxLotListSub">Exibindo {lotesFiltrados.length}</div>
                  </div>

                  <div className="luxActions" style={{ marginTop: 0, marginBottom: 12 }}>
                    <button type="button" className="btn btnGhost" onClick={limparSelecaoLotes}>
                      Limpar seleção
                    </button>
                  </div>

                  <div className="luxLotList">
                    {loading ? (
                      <div className="luxEmpty">Carregando lotes...</div>
                    ) : lotesFiltrados.length === 0 ? (
                      <div className="luxEmpty">
                        Nenhum lote encontrado com os filtros atuais.
                      </div>
                    ) : (
                      lotesFiltrados.map((lote) => {
                        const disponivel = statusDisponivel(lote.status || "");
                        const bloqueado = travarIndisponiveis && !disponivel;
                        const selecionado = selecionadoMap.has(chaveLote(lote));

                        return (
                          <button
                            key={chaveLote(lote)}
                            type="button"
                            className={[
                              "luxLotItem",
                              selecionado ? "isSelected" : "",
                              bloqueado ? "isLocked" : "",
                            ]
                              .join(" ")
                              .trim()}
                            disabled={bloqueado}
                            onClick={() => alternarSelecaoLote(lote)}
                          >
                            <div className="luxLotLeft">
                              <div className="luxLotMain">
                                Q{lote.quadra}
                                <span className="luxDot">•</span>
                                L{lote.lote}
                              </div>
                              <div className="luxLotSub">{brl(numeroSeguro(lote.valor))}</div>
                            </div>

                            <span className={`luxTag ${disponivel ? "isOk" : "isBad"}`}>
                              {selecionado
                                ? "Selecionado"
                                : disponivel
                                  ? "Disponível"
                                  : "Indisponível"}
                            </span>
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            </div>
          </section>

          {modoDocumento === "simulacao" && (
            <>
              <section className="luxSection">
                <div className="luxSectionInner">
                  <div className="luxKicker">Composição do negócio</div>
                  <h2 className="luxH2">Permuta e veículo</h2>

                  <div className="luxGrid2">
                    <div className="luxField">
                      <label>Tem permuta?</label>
                      <select
                        value={temPermuta ? "sim" : "nao"}
                        onChange={(e) => setTemPermuta(e.target.value === "sim")}
                      >
                        <option value="nao">Não</option>
                        <option value="sim">Sim</option>
                      </select>
                    </div>

                    <div className="luxField">
                      <label>Entra veículo?</label>
                      <select
                        value={temVeiculo ? "sim" : "nao"}
                        onChange={(e) => setTemVeiculo(e.target.value === "sim")}
                      >
                        <option value="nao">Não</option>
                        <option value="sim">Sim</option>
                      </select>
                    </div>
                  </div>

                  {(temPermuta || temVeiculo) && <div className="luxSpacer" />}

                  {temPermuta && (
                    <div className="luxGrid2">
                      <div className="luxField">
                        <label>O que entra na permuta</label>
                        <input
                          value={descricaoPermuta}
                          onChange={(e) => setDescricaoPermuta(e.target.value)}
                          placeholder="Ex: apartamento no Porto Cruz"
                        />
                      </div>

                      <div className="luxField">
                        <label>Valor da permuta</label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={toInputNumber(valorPermuta)}
                          onChange={(e) => setValorPermuta(numeroSeguro(e.target.value))}
                          placeholder="0"
                        />
                      </div>
                    </div>
                  )}

                  {temPermuta && temVeiculo && <div className="luxSpacer" />}

                  {temVeiculo && (
                    <div className="luxGrid2">
                      <div className="luxField">
                        <label>Modelo do veículo</label>
                        <input
                          value={modeloVeiculo}
                          onChange={(e) => setModeloVeiculo(e.target.value)}
                          placeholder="Ex: Hilux SRX 2023"
                        />
                      </div>

                      <div className="luxField">
                        <label>Valor do veículo</label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={toInputNumber(valorVeiculo)}
                          onChange={(e) => setValorVeiculo(numeroSeguro(e.target.value))}
                          placeholder="0"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </section>

              <div className="luxSplit luxSplitSingle">
                <section className="luxSection">
                  <div className="luxSectionInner">
                    <div className="luxKicker">Estrutura financeira</div>
                    <h2 className="luxH2">Valor, entrada e condições</h2>

                    <div className="luxValueRow">
                      <div className="luxValueMain">
                        <div className="luxValueLabel">Valor total dos terrenos</div>
                        <div className="luxValue">{brl(valorTerreno)}</div>
                      </div>

                      <div className="luxMiniCard">
                        <div className="luxMiniLabel">Entrada</div>
                        <div className="luxMiniValue">{brl(valorEntrada)}</div>
                        <div className="luxMiniHint">{entradaPercentual}%</div>
                      </div>

                      <div className="luxMiniCard">
                        <div className="luxMiniLabel">Saldo remanescente</div>
                        <div className="luxMiniValue">{brl(saldoFinal)}</div>
                        <div className="luxMiniHint">
                          {temSaldoFinal ? "após abatimentos e saldo final" : "após abatimentos"}
                        </div>
                      </div>
                    </div>

                    <div className="luxSpacer" />

                    <div className="luxGrid2">
                      <div className="luxField">
                        <label>Tem balão?</label>
                        <select
                          value={temBalao ? "sim" : "nao"}
                          onChange={(e) => setTemBalao(e.target.value === "sim")}
                        >
                          <option value="sim">Sim</option>
                          <option value="nao">Não</option>
                        </select>
                      </div>

                      <div className="luxField">
                        <label>Balões semestrais</label>
                        <input
                          type="number"
                          min="1"
                          value={toInputNumber(baloesSemestrais)}
                          onChange={(e) =>
                            setBaloesSemestrais(
                              Math.max(1, Math.round(numeroSeguro(e.target.value)))
                            )
                          }
                          disabled={!temBalao}
                        />
                        <div className="mini">
                          {condicaoTemBalao(condicaoSimulacao)
                            ? `Balão: ${brl(valorBalao)}`
                            : "Fluxo sem balão"}
                        </div>
                      </div>
                    </div>

                    <div className="luxSpacer" />

                    <div className="luxGrid2">
                      <div className="luxField">
                        <label>Percentual de entrada</label>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={toInputNumber(entradaPercentual)}
                          onChange={(e) =>
                            setEntradaPercentual(
                              Math.max(0, Math.min(100, numeroSeguro(e.target.value)))
                            )
                          }
                        />
                        <div className="mini">Entrada: {brl(valorEntrada)}</div>
                      </div>

                      <div className="luxField">
                        <label>Parcelas (meses)</label>
                        <input
                          type="number"
                          min="1"
                          value={toInputNumber(parcelasMeses)}
                          onChange={(e) =>
                            setParcelasMeses(
                              Math.max(1, Math.round(numeroSeguro(e.target.value)))
                            )
                          }
                        />
                        <div className="mini">Parcela: {brl(valorParcela)}</div>
                      </div>
                    </div>

                    <div className="luxSpacer" />

                    <div className="luxKicker">Pagamento futuro</div>
                    <h3 className="luxH2" style={{ fontSize: 22 }}>
                      Saldo final na entrega
                    </h3>

                    <div className="luxGrid3">
                      <div className="luxField">
                        <label>Ativar saldo final?</label>
                        <select
                          value={temSaldoFinal ? "sim" : "nao"}
                          onChange={(e) => setTemSaldoFinal(e.target.value === "sim")}
                        >
                          <option value="nao">Não</option>
                          <option value="sim">Sim</option>
                        </select>
                      </div>

                      <div className="luxField">
                        <label>Tipo</label>
                        <select
                          value={saldoFinalTipo}
                          onChange={(e) => {
                            const proximoTipo = e.target.value as TipoEntrada;
                            setSaldoFinalTipo(proximoTipo);

                            if (proximoTipo === "percentual") {
                              setSaldoFinalValor(0);
                            }
                          }}
                          disabled={!temSaldoFinal}
                        >
                          <option value="percentual">Percentual</option>
                          <option value="valor">Valor</option>
                        </select>
                      </div>

                      <div className="luxField">
                        <label>Forma prevista</label>
                        <select
                          value={saldoFinalForma}
                          onChange={(e) =>
                            setSaldoFinalForma(e.target.value as FormaSaldoFinal)
                          }
                          disabled={!temSaldoFinal}
                        >
                          <option value="quitacao">Quitação</option>
                          <option value="financiamento">Financiamento</option>
                          <option value="a_definir">A definir</option>
                        </select>
                      </div>
                    </div>

                    <div className="luxGrid3">
                      <div className="luxField">
                        <label>Percentual</label>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={toInputNumber(saldoFinalPercentual)}
                          onChange={(e) =>
                            setSaldoFinalPercentual(
                              Math.max(0, Math.min(100, numeroSeguro(e.target.value)))
                            )
                          }
                          disabled={!temSaldoFinal || saldoFinalTipo !== "percentual"}
                        />
                      </div>

                      <div className="luxField">
                        <label>Valor</label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={toInputNumber(saldoFinalValor)}
                          onChange={(e) => setSaldoFinalValor(numeroSeguro(e.target.value))}
                          disabled={!temSaldoFinal || saldoFinalTipo !== "valor"}
                        />
                      </div>

                      <div className="luxField">
                        <label>Vencimento</label>
                        <input
                          type="date"
                          value={saldoFinalVencimento}
                          onChange={(e) => setSaldoFinalVencimento(e.target.value)}
                          disabled={!temSaldoFinal}
                        />
                        <div className="mini">
                          Saldo final: {brl(valorSaldoFinalCalculado)}
                        </div>
                      </div>
                    </div>

                    <div className="luxNote">
                      <strong>Estrutura da negociação:</strong>
                      <br />
                      {resumoNegociacao.map((linha, idx) => (
                        <span key={idx}>
                          {linha}
                          <br />
                        </span>
                      ))}
                      <br />
                      <strong>Unidades:</strong>
                      <br />
                      {lotesSelecionados.length > 0 ? (
                        lotesSelecionados.map((lote, idx) => (
                          <span key={`${chaveLote(lote)}-${idx}`}>
                            • Quadra {lote.quadra} • Lote {lote.lote}
                            <br />
                          </span>
                        ))
                      ) : (
                        <span>
                          • Nenhuma unidade selecionada
                          <br />
                        </span>
                      )}
                      <br />
                      Obs.: Parcelas e balões corrigidos por INCC até a entrega e após a
                      entrega por IPCA.
                    </div>
                  </div>
                </section>

                <section className="luxSection luxResultSectionLegacy">
                  <div className="luxSectionInner luxResultPanel luxResultPanelLegacy">
                    <div className="luxKicker">Resultado</div>
                    <h2 className="luxH2">Mensagem pronta para envio</h2>

                    <div className="luxResultIntro">
                      <div className="luxResultLead">
                        Saída principal pronta para revisão, cópia imediata e geração do PDF.
                      </div>
                      <div className="luxResultPills">
                        <span className="luxChip">Mensagem comercial</span>
                        <span className="luxChip">PDF da simulação</span>
                      </div>
                    </div>

                    <div className="luxResultIntro">
                      <div className="luxResultLead">
                        Saída institucional pronta para revisão textual e geração do PDF final.
                      </div>
                      <div className="luxResultPills">
                        <span className="luxChip">Comparativo comercial</span>
                        <span className="luxChip">PDF institucional</span>
                      </div>
                    </div>

                    <textarea
                      className="whats luxWhats luxWhatsPremium"
                      value={mensagemWhatsApp}
                      onChange={() => {}}
                      readOnly
                    />

                    <div className="luxActions luxResultActions">
                      <button type="button" className="btn luxActionPrimary" onClick={copiarMensagem}>
                        {copiado ? "Copiado!" : "Copiar mensagem"}
                      </button>

                      <button
                        type="button"
                        className="btn btnGhost luxActionSecondary"
                        onClick={() => sincronizarNegociacaoNoCrm("simulacao")}
                      >
                        {negociacaoAtivaId
                          ? "Atualizar simulação no CRM"
                          : "Salvar simulação no CRM"}
                      </button>

                      <button type="button" className="btn btnGhost luxActionSecondary" onClick={gerarPdf}>
                        Gerar PDF
                      </button>

                      <span className="luxHint luxResultHint">
                        INCC até entrega • IPCA após entrega
                      </span>
                    </div>

                    <div className="foot luxResultFoot">
                      Próximas evoluções: histórico de simulações • modos de atendimento
                      • propostas comerciais avançadas
                    </div>
                  </div>
                </section>
              </div>
            </>
          )}

          {(modoDocumento === "proposta" || modoDocumento === "contraproposta") && (
            <>
              <section className="luxSection">
                <div className="luxSectionInner">
                  <div className="luxKicker">Negociação</div>
                  <h2 className="luxH2">Proposta recebida do cliente</h2>

                  <div className="luxGrid3">
                    <div className="luxField">
                      <label>Quadra</label>
                      <input value={quadraProposta} readOnly />
                    </div>

                    <div className="luxField">
                      <label>Lote</label>
                      <input value={loteProposta} readOnly />
                    </div>

                    <div className="luxField">
                      <label>Valor</label>
                      <input value={brl(valorTerreno)} readOnly />
                    </div>
                  </div>

                  <div className="luxSpacer" />

                  <div className="luxGrid2">
                    <div className="luxField">
                      <label>Valor ofertado</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={toInputNumber(propostaCliente.valorOfertado)}
                        onChange={(e) =>
                          setPropostaCliente((anterior) => ({
                            ...anterior,
                            valorOfertado: numeroSeguro(e.target.value),
                          }))
                        }
                      />
                    </div>

                    <div className="luxField">
                      <label>Tipo de entrada</label>
                      <select
                        value={propostaCliente.condicao.entradaTipo}
                        onChange={(e) =>
                          setPropostaCliente((anterior) => ({
                            ...anterior,
                            condicao: {
                              ...anterior.condicao,
                              entradaTipo: e.target.value as TipoEntrada,
                            },
                          }))
                        }
                      >
                        <option value="percentual">Percentual</option>
                        <option value="valor">Valor fixo</option>
                      </select>
                    </div>
                  </div>

                  <div className="luxSpacer" />

                  <div className="luxGrid2">
                    <div className="luxField">
                      <label>Entrada: valor</label>
                      <input value={brl(resumoPropostaCliente.calculo.entrada)} readOnly />
                    </div>

                    <div className="luxField">
                      <label>Entrada: qtd. parcelas</label>
                      <input
                        type="number"
                        min="0"
                        value={toInputNumber(propostaCliente.entradaQuantidadeParcelas)}
                        onChange={(e) =>
                          setPropostaCliente((anterior) => ({
                            ...anterior,
                            entradaQuantidadeParcelas: Math.max(
                              1,
                              Math.round(numeroSeguro(e.target.value))
                            ),
                          }))
                        }
                      />
                    </div>

                    <div className="luxField">
                      <label>Entrada: valor da parcela</label>
                      <input
                        value={brl(
                          resumoPropostaCliente.calculo.entrada /
                            Math.max(1, propostaCliente.entradaQuantidadeParcelas)
                        )}
                        readOnly
                      />
                    </div>

                    <div className="luxField">
                      <label>Entrada: 1º vencimento</label>
                      <input
                        type="date"
                        value={propostaCliente.entradaPrimeiroVencimento}
                        onChange={(e) =>
                          setPropostaCliente((anterior) => ({
                            ...anterior,
                            entradaPrimeiroVencimento: e.target.value,
                          }))
                        }
                      />
                    </div>
                  </div>

                  <div className="luxSpacer" />

                  <div className="luxGrid3">
                    <div className="luxField">
                      <label>
                        {propostaCliente.condicao.entradaTipo === "percentual"
                          ? "Entrada (%)"
                          : "Entrada (R$)"}
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={toInputNumber(propostaCliente.condicao.entradaValor)}
                        onChange={(e) =>
                          setPropostaCliente((anterior) => ({
                            ...anterior,
                            condicao: {
                              ...anterior.condicao,
                              entradaValor: numeroSeguro(e.target.value),
                            },
                          }))
                        }
                      />
                    </div>

                    <div className="luxField">
                      <label>Parcelas (meses)</label>
                      <input
                        type="number"
                        min="1"
                        value={toInputNumber(propostaCliente.condicao.parcelasMeses)}
                        onChange={(e) =>
                          setPropostaCliente((anterior) => ({
                            ...anterior,
                            condicao: {
                              ...anterior.condicao,
                              parcelasMeses: Math.max(
                                1,
                                Math.round(numeroSeguro(e.target.value))
                              ),
                            },
                          }))
                        }
                      />
                    </div>

                    <div className="luxField">
                      <label>Tem balão?</label>
                      <select
                        value={propostaCliente.condicao.temBalao ? "sim" : "nao"}
                        onChange={(e) =>
                          setPropostaCliente((anterior) => ({
                            ...anterior,
                            condicao: normalizarCondicaoPagamento({
                              ...anterior.condicao,
                              temBalao: e.target.value === "sim",
                            }),
                          }))
                        }
                      >
                        <option value="sim">Sim</option>
                        <option value="nao">Não</option>
                      </select>
                    </div>

                    <div className="luxField">
                      <label>Balões semestrais</label>
                      <input
                        type="number"
                        min="1"
                        value={toInputNumber(propostaCliente.condicao.baloesSemestrais)}
                        onChange={(e) =>
                          setPropostaCliente((anterior) => ({
                            ...anterior,
                            condicao: normalizarCondicaoPagamento({
                              ...anterior.condicao,
                              baloesSemestrais: Math.max(
                                1,
                                Math.round(numeroSeguro(e.target.value))
                              ),
                            }),
                          }))
                        }
                        disabled={!propostaCliente.condicao.temBalao}
                      />
                    </div>
                  </div>

                  <div className="luxSpacer" />

                  <div className="luxGrid3">
                    <div className="luxField">
                      <label>Mensais: qtd. parcelas</label>
                      <input
                        value={toInputNumber(propostaCliente.condicao.parcelasMeses)}
                        readOnly
                      />
                    </div>

                    <div className="luxField">
                      <label>Mensais: valor da parcela</label>
                      <input value={brl(resumoPropostaCliente.calculo.valorParcela)} readOnly />
                    </div>

                    <div className="luxField">
                      <label>Mensais: 1º vencimento</label>
                      <input
                        type="date"
                        value={propostaCliente.mensaisPrimeiroVencimento}
                        onChange={(e) =>
                          setPropostaCliente((anterior) => ({
                            ...anterior,
                            mensaisPrimeiroVencimento: e.target.value,
                          }))
                        }
                      />
                    </div>
                  </div>

                  <div className="luxSpacer" />

                  {condicaoTemBalao(propostaCliente.condicao) ? (
                    <div className="luxGrid2">
                      <div className="luxField">
                        <label>Balão: tipo</label>
                        <select
                          value={propostaCliente.balaoTipo}
                          onChange={(e) =>
                            setPropostaCliente((anterior) => ({
                              ...anterior,
                              balaoTipo: e.target.value as TipoBalao,
                            }))
                          }
                        >
                          <option value="semestral">Semestral</option>
                          <option value="anual">Anual</option>
                        </select>
                      </div>

                      <div className="luxField">
                        <label>Balão: qtd. parcelas</label>
                        <input
                          value={toInputNumber(propostaCliente.condicao.baloesSemestrais)}
                          readOnly
                        />
                      </div>

                      <div className="luxField">
                        <label>Balão: valor da parcela</label>
                        <input value={brl(resumoPropostaCliente.calculo.valorBalao)} readOnly />
                      </div>

                      <div className="luxField">
                        <label>Balão: 1º vencimento</label>
                        <input
                          type="date"
                          value={propostaCliente.balaoPrimeiroVencimento}
                          onChange={(e) =>
                            setPropostaCliente((anterior) => ({
                              ...anterior,
                              balaoPrimeiroVencimento: e.target.value,
                            }))
                          }
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="luxNote">Fluxo sem balão nesta proposta.</div>
                  )}

                  <div className="luxSpacer" />

                  <div className="luxGrid2">
                    <div className="luxField">
                      <label>Tem permuta?</label>
                      <select
                        value={propostaCliente.temPermuta ? "sim" : "nao"}
                        onChange={(e) =>
                          setPropostaCliente((anterior) => ({
                            ...anterior,
                            temPermuta: e.target.value === "sim",
                          }))
                        }
                      >
                        <option value="nao">Não</option>
                        <option value="sim">Sim</option>
                      </select>
                    </div>

                    <div className="luxField">
                      <label>Entra veículo?</label>
                      <select
                        value={propostaCliente.temVeiculo ? "sim" : "nao"}
                        onChange={(e) =>
                          setPropostaCliente((anterior) => ({
                            ...anterior,
                            temVeiculo: e.target.value === "sim",
                          }))
                        }
                      >
                        <option value="nao">Não</option>
                        <option value="sim">Sim</option>
                      </select>
                    </div>
                  </div>

                  {(propostaCliente.temPermuta || propostaCliente.temVeiculo) && (
                    <div className="luxSpacer" />
                  )}

                  {propostaCliente.temPermuta && (
                    <div className="luxGrid2">
                      <div className="luxField">
                        <label>Descrição da permuta</label>
                        <input
                          value={propostaCliente.permuta?.descricao || ""}
                          onChange={(e) =>
                            setPropostaCliente((anterior) => ({
                              ...anterior,
                              permuta: {
                                descricao: e.target.value,
                                valor: numeroSeguro(anterior.permuta?.valor),
                              },
                            }))
                          }
                          placeholder="Ex: casa, apartamento, terreno"
                        />
                      </div>

                      <div className="luxField">
                        <label>Valor da permuta</label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={toInputNumber(numeroSeguro(propostaCliente.permuta?.valor))}
                          onChange={(e) =>
                            setPropostaCliente((anterior) => ({
                              ...anterior,
                              permuta: {
                                descricao: anterior.permuta?.descricao || "",
                                valor: numeroSeguro(e.target.value),
                              },
                            }))
                          }
                        />
                      </div>
                    </div>
                  )}

                  {propostaCliente.temPermuta && propostaCliente.temVeiculo && (
                    <div className="luxSpacer" />
                  )}

                  {propostaCliente.temVeiculo && (
                    <div className="luxGrid2">
                      <div className="luxField">
                        <label>Descrição do veículo</label>
                        <input
                          value={propostaCliente.veiculo?.descricao || ""}
                          onChange={(e) =>
                            setPropostaCliente((anterior) => ({
                              ...anterior,
                              veiculo: {
                                descricao: e.target.value,
                                valor: numeroSeguro(anterior.veiculo?.valor),
                              },
                            }))
                          }
                          placeholder="Ex: Hilux, Volvo XC60, CR-V"
                        />
                      </div>

                      <div className="luxField">
                        <label>Valor do veículo</label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={toInputNumber(numeroSeguro(propostaCliente.veiculo?.valor))}
                          onChange={(e) =>
                            setPropostaCliente((anterior) => ({
                              ...anterior,
                              veiculo: {
                                descricao: anterior.veiculo?.descricao || "",
                                valor: numeroSeguro(e.target.value),
                              },
                            }))
                          }
                        />
                      </div>
                    </div>
                  )}

                  <div className="luxSpacer" />

                  <div className="luxField">
                    <label>Observações da proposta</label>
                    <textarea
                      className="whats"
                      style={{ minHeight: 120 }}
                      value={propostaCliente.observacoes}
                      onChange={(e) =>
                        setPropostaCliente((anterior) => ({
                          ...anterior,
                          observacoes: e.target.value,
                        }))
                      }
                      placeholder="Ex: cliente busca entrada menor, quer reforçar com permuta, precisa de aprovação da diretoria..."
                    />
                  </div>

                  <div className="luxNote">
                    <strong>Resumo da proposta:</strong>
                    <br />
                    {resumoPropostaCliente.linhas.map((linha, idx) => (
                      <span key={idx}>
                        {linha}
                        <br />
                      </span>
                    ))}
                  </div>
                </div>
              </section>

              {modoDocumento === "contraproposta" && (
                <section className="luxSection">
                  <div className="luxSectionInner">
                    <div className="luxKicker">Retorno da incorporadora</div>
                    <h2 className="luxH2">Contra-proposta da BOMM</h2>

                    <div className="luxGrid2">
                      <div className="luxField">
                        <label>Valor aprovado</label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={toInputNumber(contrapropostaBomm.valorAprovado)}
                          onChange={(e) =>
                            setContrapropostaBomm((anterior) => ({
                              ...anterior,
                              valorAprovado: numeroSeguro(e.target.value),
                            }))
                          }
                        />
                      </div>

                      <div className="luxField">
                        <label>Tipo de entrada</label>
                        <select
                          value={contrapropostaBomm.condicao.entradaTipo}
                          onChange={(e) =>
                            setContrapropostaBomm((anterior) => ({
                              ...anterior,
                              condicao: {
                                ...anterior.condicao,
                                entradaTipo: e.target.value as TipoEntrada,
                              },
                            }))
                          }
                        >
                          <option value="percentual">Percentual</option>
                          <option value="valor">Valor fixo</option>
                        </select>
                      </div>
                    </div>

                    <div className="luxSpacer" />

                    <div className="luxGrid3">
                      <div className="luxField">
                        <label>
                          {contrapropostaBomm.condicao.entradaTipo === "percentual"
                            ? "Entrada (%)"
                            : "Entrada (R$)"}
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={toInputNumber(contrapropostaBomm.condicao.entradaValor)}
                          onChange={(e) =>
                            setContrapropostaBomm((anterior) => ({
                              ...anterior,
                              condicao: {
                                ...anterior.condicao,
                                entradaValor: numeroSeguro(e.target.value),
                              },
                            }))
                          }
                        />
                      </div>

                      <div className="luxField">
                        <label>Parcelas (meses)</label>
                        <input
                          type="number"
                          min="1"
                          value={toInputNumber(contrapropostaBomm.condicao.parcelasMeses)}
                          onChange={(e) =>
                            setContrapropostaBomm((anterior) => ({
                              ...anterior,
                              condicao: {
                                ...anterior.condicao,
                                parcelasMeses: Math.max(
                                  1,
                                  Math.round(numeroSeguro(e.target.value))
                                ),
                              },
                            }))
                          }
                        />
                      </div>

                      <div className="luxField">
                        <label>Tem balão?</label>
                        <select
                          value={contrapropostaBomm.condicao.temBalao ? "sim" : "nao"}
                          onChange={(e) =>
                            setContrapropostaBomm((anterior) => ({
                              ...anterior,
                              condicao: normalizarCondicaoPagamento({
                                ...anterior.condicao,
                                temBalao: e.target.value === "sim",
                              }),
                            }))
                          }
                        >
                          <option value="sim">Sim</option>
                          <option value="nao">Não</option>
                        </select>
                      </div>

                      <div className="luxField">
                        <label>Balões semestrais</label>
                        <input
                          type="number"
                          min="1"
                          value={toInputNumber(contrapropostaBomm.condicao.baloesSemestrais)}
                          onChange={(e) =>
                            setContrapropostaBomm((anterior) => ({
                              ...anterior,
                              condicao: normalizarCondicaoPagamento({
                                ...anterior.condicao,
                                baloesSemestrais: Math.max(
                                  1,
                                  Math.round(numeroSeguro(e.target.value))
                                ),
                              }),
                            }))
                          }
                          disabled={!contrapropostaBomm.condicao.temBalao}
                        />
                      </div>
                    </div>

                    <div className="luxSpacer" />

                    {!condicaoTemBalao(contrapropostaBomm.condicao) && (
                      <>
                        <div className="luxNote">Fluxo sem balão nesta contraproposta.</div>
                        <div className="luxSpacer" />
                      </>
                    )}

                    <div className="luxGrid2">
                      <div className="luxField">
                        <label>Tem permuta aceita?</label>
                        <select
                          value={contrapropostaBomm.temPermuta ? "sim" : "nao"}
                          onChange={(e) =>
                            setContrapropostaBomm((anterior) => ({
                              ...anterior,
                              temPermuta: e.target.value === "sim",
                            }))
                          }
                        >
                          <option value="nao">Não</option>
                          <option value="sim">Sim</option>
                        </select>
                      </div>

                      <div className="luxField">
                        <label>Tem veículo aceito?</label>
                        <select
                          value={contrapropostaBomm.temVeiculo ? "sim" : "nao"}
                          onChange={(e) =>
                            setContrapropostaBomm((anterior) => ({
                              ...anterior,
                              temVeiculo: e.target.value === "sim",
                            }))
                          }
                        >
                          <option value="nao">Não</option>
                          <option value="sim">Sim</option>
                        </select>
                      </div>
                    </div>

                    {(contrapropostaBomm.temPermuta || contrapropostaBomm.temVeiculo) && (
                      <div className="luxSpacer" />
                    )}

                    {contrapropostaBomm.temPermuta && (
                      <div className="luxGrid2">
                        <div className="luxField">
                          <label>Descrição da permuta aceita</label>
                          <input
                            value={contrapropostaBomm.permutaAceita?.descricao || ""}
                            onChange={(e) =>
                              setContrapropostaBomm((anterior) => ({
                                ...anterior,
                                permutaAceita: {
                                  descricao: e.target.value,
                                  valor: numeroSeguro(anterior.permutaAceita?.valor),
                                },
                              }))
                            }
                            placeholder="Ex: apartamento, casa, terreno"
                          />
                        </div>

                        <div className="luxField">
                          <label>Valor da permuta aceita</label>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={toInputNumber(
                              numeroSeguro(contrapropostaBomm.permutaAceita?.valor)
                            )}
                            onChange={(e) =>
                              setContrapropostaBomm((anterior) => ({
                                ...anterior,
                                permutaAceita: {
                                  descricao: anterior.permutaAceita?.descricao || "",
                                  valor: numeroSeguro(e.target.value),
                                },
                              }))
                            }
                          />
                        </div>
                      </div>
                    )}

                    {contrapropostaBomm.temPermuta && contrapropostaBomm.temVeiculo && (
                      <div className="luxSpacer" />
                    )}

                    {contrapropostaBomm.temVeiculo && (
                      <div className="luxGrid2">
                        <div className="luxField">
                          <label>Descrição do veículo aceito</label>
                          <input
                            value={contrapropostaBomm.veiculoAceito?.descricao || ""}
                            onChange={(e) =>
                              setContrapropostaBomm((anterior) => ({
                                ...anterior,
                                veiculoAceito: {
                                  descricao: e.target.value,
                                  valor: numeroSeguro(anterior.veiculoAceito?.valor),
                                },
                              }))
                            }
                            placeholder="Ex: Hilux, Volvo XC60, CR-V"
                          />
                        </div>

                        <div className="luxField">
                          <label>Valor do veículo aceito</label>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={toInputNumber(
                              numeroSeguro(contrapropostaBomm.veiculoAceito?.valor)
                            )}
                            onChange={(e) =>
                              setContrapropostaBomm((anterior) => ({
                                ...anterior,
                                veiculoAceito: {
                                  descricao: anterior.veiculoAceito?.descricao || "",
                                  valor: numeroSeguro(e.target.value),
                                },
                              }))
                            }
                          />
                        </div>
                      </div>
                    )}

                    <div className="luxSpacer" />

                    <div className="luxGrid2">
                      <div className="luxField">
                        <label>Validade da contraproposta</label>
                        <input
                          value={contrapropostaBomm.validade}
                          onChange={(e) =>
                            setContrapropostaBomm((anterior) => ({
                              ...anterior,
                              validade: e.target.value,
                            }))
                          }
                          placeholder="Ex: válida por 7 dias"
                        />
                      </div>

                      <div className="luxField">
                        <label>Observações comerciais</label>
                        <input
                          value={contrapropostaBomm.observacoes}
                          onChange={(e) =>
                            setContrapropostaBomm((anterior) => ({
                              ...anterior,
                              observacoes: e.target.value,
                            }))
                          }
                          placeholder="Ex: veículo sujeito à vistoria, permuta sujeita à análise"
                        />
                      </div>
                    </div>

                    <div className="luxNote">
                      <strong>Resumo da contraproposta:</strong>
                      <br />
                      {resumoContraproposta.linhas.map((linha, idx) => (
                        <span key={idx}>
                          {linha}
                          <br />
                        </span>
                      ))}
                    </div>
                  </div>
                </section>
              )}

              <div className="luxSplit luxSplitSingle">
                <section className="luxSection">
                  <div className="luxSectionInner">
                    <div className="luxKicker">Comparativo</div>
                    <h2 className="luxH2">
                      {modoDocumento === "proposta"
                        ? "Resumo da proposta"
                        : "Proposta x contra-proposta"}
                    </h2>

                    <div className="luxNote">
                      <strong>Valor dos lotes selecionados:</strong> {brl(valorTerreno)}
                      <br />
                      <br />

                      <strong>Unidades:</strong>
                      <br />
                      {lotesSelecionados.length > 0 ? (
                        lotesSelecionados.map((lote, idx) => (
                          <span key={`${chaveLote(lote)}-${idx}`}>
                            • Quadra {lote.quadra} • Lote {lote.lote}
                            <br />
                          </span>
                        ))
                      ) : (
                        <span>
                          • Nenhuma unidade selecionada
                          <br />
                        </span>
                      )}

                      <br />

                      <strong>Proposta do cliente:</strong>
                      <br />
                      {resumoPropostaCliente.linhas.map((linha, idx) => (
                        <span key={`pc-${idx}`}>
                          {linha}
                          <br />
                        </span>
                      ))}

                      {modoDocumento === "contraproposta" && (
                        <>
                          <br />
                          <strong>Contra-proposta da BOMM:</strong>
                          <br />
                          {resumoContraproposta.linhas.map((linha, idx) => (
                            <span key={`cb-${idx}`}>
                              {linha}
                              <br />
                            </span>
                          ))}
                        </>
                      )}

                      <br />
                      Obs.: Parcelas e balões corrigidos por INCC até a entrega e após a
                      entrega por IPCA.
                    </div>
                  </div>
                </section>

                <section className="luxSection luxResultSectionLegacy">
                  <div className="luxSectionInner luxResultPanelLegacy">
                    <div className="luxKicker">Resultado</div>
                    <h2 className="luxH2">Mensagem pronta para envio</h2>

                    <textarea
                      className="whats luxWhats luxWhatsPremium"
                      value={mensagemWhatsApp}
                      onChange={() => {}}
                      readOnly
                    />

                    <div className="luxActions luxResultActions">
                      <button type="button" className="btn luxActionPrimary" onClick={copiarMensagem}>
                        {copiado ? "Copiado!" : "Copiar mensagem"}
                      </button>

                      <button
                        type="button"
                        className="btn btnGhost luxActionSecondary"
                        onClick={() =>
                          sincronizarNegociacaoNoCrm(modoDocumento, {
                            gerarPdfDepois: true,
                          })
                        }
                      >
                        {modoDocumento === "proposta"
                          ? "Gerar proposta + PDF + salvar no CRM"
                          : "Gerar contraproposta + PDF + salvar no CRM"}
                      </button>

                      <button type="button" className="btn btnGhost luxActionSecondary" onClick={gerarPdf}>
                        Gerar PDF
                      </button>

                      <span className="luxHint luxResultHint">
                        INCC até entrega • IPCA após entrega
                      </span>
                    </div>

                    <div className="foot luxResultFoot">
                      Evolução atual: base pronta para proposta e contra-proposta dentro
                      do mesmo sistema.
                    </div>
                  </div>
                </section>
              </div>
            </>
          )}
            </div>

            <div className="luxRail">
              <section className="luxFlowPanel luxSupportPanel">
                <div className="luxFlowHead">
                  <div className="luxKicker">Apoio operacional</div>
                  <h2 className="luxH2">{painelApoioTitulo}</h2>
                  <p className="luxFlowText">{painelApoioDescricao}</p>
                </div>

                <div className="luxSupportBody">
                  <div className="luxResultIntro">
                    <div className="luxResultLead">
                      {modoDocumento === "simulacao"
                        ? "Mensagem comercial pronta para revisão, cópia imediata e geração do PDF."
                        : "Mensagem final pronta para revisão textual, sincronização da negociação e PDF institucional."}
                    </div>
                    <div className="luxResultPills">
                      <span className="luxChip">
                        {modoDocumento === "simulacao"
                          ? "Mensagem comercial"
                          : "Mensagem institucional"}
                      </span>
                      <span className="luxChip">
                        {modoDocumento === "simulacao"
                          ? "PDF da simulação"
                          : modoDocumento === "proposta"
                            ? "PDF da proposta"
                            : "PDF da contraproposta"}
                      </span>
                    </div>
                  </div>

                  <textarea
                    className="whats luxWhats luxWhatsPremium"
                    value={mensagemWhatsApp}
                    onChange={() => {}}
                    readOnly
                  />

                  <div className="luxActions luxResultActions">
                    <button type="button" className="btn luxActionPrimary" onClick={copiarMensagem}>
                      {copiado ? "Copiado!" : "Copiar mensagem"}
                    </button>

                    <button
                      type="button"
                      className="btn btnGhost luxActionSecondary"
                      onClick={() =>
                        modoDocumento === "simulacao"
                          ? sincronizarNegociacaoNoCrm("simulacao")
                          : sincronizarNegociacaoNoCrm(modoDocumento, {
                              gerarPdfDepois: true,
                            })
                      }
                    >
                      {modoDocumento === "simulacao"
                        ? negociacaoAtivaId
                          ? "Atualizar simulação no CRM"
                          : "Salvar simulação no CRM"
                        : modoDocumento === "proposta"
                          ? "Gerar proposta + PDF + salvar no CRM"
                          : "Gerar contraproposta + PDF + salvar no CRM"}
                    </button>

                    <button type="button" className="btn btnGhost luxActionSecondary" onClick={gerarPdf}>
                      Gerar PDF
                    </button>

                    <span className="luxHint luxResultHint">
                      INCC até entrega - IPCA após entrega
                    </span>
                  </div>

                  <div className="foot luxResultFoot">{painelApoioRodape}</div>
                </div>
              </section>

              <aside className="luxSidebar">
              <section className="luxFlowPanel">
                <div className="luxFlowHead">
                  <div className="luxKicker">Resumo financeiro</div>
                  <h2 className="luxH2">Linha do cálculo</h2>
                  <p className="luxFlowText">
                    Ordem real do cálculo: valor total, entrada, saldo final,
                    permuta, veículo e base final para mensais e balões.
                  </p>
                </div>

                <div className="luxFlowList">
                  {flowItems.map((item, index) => (
                    <div
                      key={`${item.label}-${index}`}
                      className={["luxFlowItem", item.tone].join(" ").trim()}
                    >
                      <div className="luxFlowBadge">{index + 1}</div>
                      <div className="luxFlowBody">
                        <div className="luxFlowLabel">{item.label}</div>
                        <div className="luxFlowValue">{item.value}</div>
                        <div className="luxFlowHint">{item.hint}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section className="luxFlowPanel luxFlowPanelSoft">
                <div className="luxFlowHead">
                  <div className="luxKicker">Seleção atual</div>
                  <h2 className="luxH2">Lotes escolhidos</h2>
                </div>

                <div className="luxChipRow">
                  {lotesSelecionadosResumo.length > 0 ? (
                    lotesSelecionadosResumo.map((item) => (
                      <span key={item.key} className="luxChip">
                        {item.label}
                      </span>
                    ))
                  ) : (
                    <span className="luxFlowEmpty">
                      Nenhum lote selecionado até o momento.
                    </span>
                  )}
                </div>

                <div className="luxFlowMeta">
                  <div className="luxFlowMetaItem">
                    <span className="luxFlowMetaLabel">Modo</span>
                    <strong>{modoDocumento}</strong>
                  </div>
                  <div className="luxFlowMetaItem">
                    <span className="luxFlowMetaLabel">Cliente</span>
                    <strong>{cliente || "Não informado"}</strong>
                  </div>
                  <div className="luxFlowMetaItem">
                    <span className="luxFlowMetaLabel">Saída</span>
                    <strong>
                      {modoDocumento === "simulacao"
                        ? "Mensagem + PDF"
                        : "PDF institucional"}
                    </strong>
                  </div>
                </div>
              </section>
              </aside>
            </div>
          </div>

          {feedbackNegociacao ? (
            <div className="luxNote luxCentralFeedback">{feedbackNegociacao}</div>
          ) : null}
        </main>
      </div>
    </div>
  );
}
