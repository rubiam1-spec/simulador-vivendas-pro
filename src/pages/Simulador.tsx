import { useEffect, useMemo, useState } from "react";
import jsPDF from "jspdf";
import { carregarLotes, type Lote } from "../services/planilhaService";
import {
  gerarPdfContraproposta,
  gerarPdfProposta,
} from "../services/pdfService";
import "./simulador.css";

import logoVivendas from "../assets/logo-vivendas.png";
import logoBomm from "../assets/logo-bomm.png";

type StatusFiltro = "todos" | "disponivel" | "indisponivel";
type ModoDocumento = "simulacao" | "proposta" | "contraproposta";
type TipoEntrada = "percentual" | "valor";
type TipoBalao = "anual" | "semestral";

type CondicaoPagamento = {
  entradaTipo: TipoEntrada;
  entradaValor: number;
  parcelasMeses: number;
  baloesSemestrais: number;
  percentualParcelas: number;
  percentualBaloes: number;
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
  return {
    entradaTipo: "percentual",
    entradaValor: 20,
    parcelasMeses: 36,
    baloesSemestrais: 6,
    percentualParcelas: 30,
    percentualBaloes: 70,
  };
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
  const entrada = calcularEntrada(valorBase, condicao);
  const saldoInicial = Math.max(valorBase - entrada, 0);
  const saldoFinal = Math.max(saldoInicial - valorPermuta - valorVeiculo, 0);

  const baseParcelas =
    saldoFinal * (Math.max(0, numeroSeguro(condicao.percentualParcelas)) / 100);
  const baseBaloes =
    saldoFinal * (Math.max(0, numeroSeguro(condicao.percentualBaloes)) / 100);

  const valorParcela =
    condicao.parcelasMeses > 0 ? baseParcelas / condicao.parcelasMeses : 0;

  const valorBalao =
    condicao.baloesSemestrais > 0 ? baseBaloes / condicao.baloesSemestrais : 0;

  return {
    entrada,
    saldoInicial,
    saldoFinal,
    baseParcelas,
    baseBaloes,
    valorParcela,
    valorBalao,
  };
}

export default function Simulador() {
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
  const [corretor, setCorretor] = useState("");
  const [creci, setCreci] = useState("");
  const [imobiliaria, setImobiliaria] = useState("");

  const [quadraFiltro, setQuadraFiltro] = useState("");
  const [loteFiltro, setLoteFiltro] = useState("");
  const [busca, setBusca] = useState("");
  const [statusFiltro, setStatusFiltro] = useState<StatusFiltro>("todos");
  const [travarIndisponiveis, setTravarIndisponiveis] = useState(true);

  const [lotesSelecionados, setLotesSelecionados] = useState<Lote[]>([]);

  const [entradaPercentual, setEntradaPercentual] = useState(20);
  const [parcelasMeses, setParcelasMeses] = useState(36);
  const [baloesSemestrais, setBaloesSemestrais] = useState(6);

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

  useEffect(() => {
    async function init() {
      try {
        setLoading(true);
        setErro("");
        const dados = await carregarLotes();
        setLotes(dados);
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

  const valorEntrada = valorTerreno * (numeroSeguro(entradaPercentual) / 100);
  const saldoInicial = Math.max(valorTerreno - valorEntrada, 0);

  const permutaAplicada = temPermuta ? numeroSeguro(valorPermuta) : 0;
  const veiculoAplicado = temVeiculo ? numeroSeguro(valorVeiculo) : 0;

  const saldoFinal = Math.max(
    saldoInicial - permutaAplicada - veiculoAplicado,
    0
  );

  const baseParcelas = saldoFinal * 0.3;
  const baseBaloes = saldoFinal * 0.7;

  const valorParcela =
    parcelasMeses > 0 ? baseParcelas / numeroSeguro(parcelasMeses) : 0;

  const valorBalao =
    baloesSemestrais > 0 ? baseBaloes / numeroSeguro(baloesSemestrais) : 0;

  useEffect(() => {
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
      condicao: {
        entradaTipo: "percentual",
        entradaValor: entradaPercentual,
        parcelasMeses,
        baloesSemestrais,
        percentualParcelas: 30,
        percentualBaloes: 70,
      },
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
    parcelasMeses,
    baloesSemestrais,
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

    linhas.push(`• Saldo estimado: ${brl(calculo.saldoFinal)}`);
    linhas.push(
      `• ${propostaCliente.condicao.parcelasMeses} parcelas mensais de ${brl(calculo.valorParcela)}`
    );
    linhas.push(
      `• ${propostaCliente.condicao.baloesSemestrais} balões semestrais de ${brl(calculo.valorBalao)}`
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

    linhas.push(`• Saldo remanescente: ${brl(calculo.saldoFinal)}`);
    linhas.push(
      `• ${contrapropostaBomm.condicao.parcelasMeses} parcelas mensais de ${brl(calculo.valorParcela)}`
    );
    linhas.push(
      `• ${contrapropostaBomm.condicao.baloesSemestrais} balões semestrais de ${brl(calculo.valorBalao)}`
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
      linhas.push(`Opa, ${cliente || "Nome"}! 😊`);
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

      linhas.push(`• Saldo remanescente: ${brl(saldoFinal)}`);
      linhas.push("");
      linhas.push("📋 Condição sugerida:");
      linhas.push(`• ${parcelasMeses} parcelas mensais de ${brl(valorParcela)}`);
      linhas.push(
        `• ${baloesSemestrais} balões semestrais de ${brl(valorBalao)}`
      );
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
        balao: {
          tipo: propostaCliente.balaoTipo,
          quantidadeParcelas: String(propostaCliente.condicao.baloesSemestrais),
          valorParcela: brl(resumoPropostaCliente.calculo.valorBalao),
          primeiroVencimento: propostaCliente.balaoPrimeiroVencimento || "-",
        },
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
          balaoTipo: "semestral",
          balaoQuantidade: `${contrapropostaBomm.condicao.baloesSemestrais}x`,
          balaoValor: brl(resumoContraproposta.calculo.valorBalao),
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

    const doc = new jsPDF({
      unit: "pt",
      format: "a4",
    });

    const margemX = 42;
    let y = 40;

    const tituloPdf = "Simulação Comercial";

    doc.setFillColor(21, 42, 34);
    doc.roundedRect(24, 24, 547, 794, 18, 18, "F");

    try {
      doc.addImage(logoVivendas, "PNG", margemX, y, 88, 28);
      doc.addImage(logoBomm, "PNG", 470, y + 2, 60, 22);
    } catch {
      // segue sem imagem
    }

    y += 48;

    doc.setTextColor(245, 245, 245);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.text(tituloPdf, margemX, y);

    y += 24;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.setTextColor(194, 209, 201);
    doc.text("Vivendas do Bosque • BOMM Urbanizadora", margemX, y);

    y += 34;

    doc.setDrawColor(72, 94, 83);
    doc.line(margemX, y, 530, y);

    y += 24;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(245, 245, 245);
    doc.text("Dados do atendimento", margemX, y);

    y += 20;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.setTextColor(230, 235, 232);

    const blocoAtendimento = [
      `Cliente: ${cliente || "-"}`,
      `Corretor(a): ${corretor || "-"}`,
      `Imobiliária: ${imobiliaria || "-"}`,
      `Quantidade de lotes: ${quantidadeLotesSelecionados || 0}`,
    ];

    blocoAtendimento.forEach((linha) => {
      doc.text(linha, margemX, y);
      y += 16;
    });

    y += 10;
    doc.setFont("helvetica", "bold");
    doc.text("Unidades selecionadas", margemX, y);

    y += 18;
    doc.setFont("helvetica", "normal");

    const unidadesPdf =
      lotesSelecionados.length > 0
        ? lotesSelecionados.map(
            (lote) => `• Quadra ${lote.quadra} • Lote ${lote.lote}`
          )
        : ["• Nenhuma unidade selecionada"];

    unidadesPdf.forEach((linha) => {
      doc.text(linha, margemX, y);
      y += 16;
    });

    y += 10;

    if (modoDocumento === "simulacao") {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.setTextColor(245, 245, 245);
      doc.text("Estrutura da negociação", margemX, y);

      y += 20;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      doc.setTextColor(230, 235, 232);

      resumoNegociacao.forEach((linha) => {
        doc.text(linha, margemX, y);
        y += 16;
      });

      y += 12;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.setTextColor(245, 245, 245);
      doc.text("Condição sugerida", margemX, y);

      y += 20;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      doc.setTextColor(230, 235, 232);

      [
        `• ${parcelasMeses} parcelas mensais de ${brl(valorParcela)}`,
        `• ${baloesSemestrais} balões semestrais de ${brl(valorBalao)}`,
        "• Correção via INCC durante a obra e, após a entrega, IPCA.",
      ].forEach((linha) => {
        doc.text(linha, margemX, y);
        y += 16;
      });
    }

    y += 18;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(245, 245, 245);
    doc.text("Mensagem pronta", margemX, y);

    y += 18;
    doc.setFont("courier", "normal");
    doc.setFontSize(9);
    doc.setTextColor(225, 231, 227);

    const linhasMensagem = doc.splitTextToSize(mensagemWhatsApp, 485);
    doc.text(linhasMensagem, margemX, y);

    const nomeArquivo = "simulacao-vivendas.pdf";

    doc.save(nomeArquivo);
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

  return (
    <div className="simPage">
      <div className="luxWrap">
        <div className="luxTopbar">
          <div className="luxBrand">
            <img src={logoVivendas} alt="Vivendas do Bosque" className="luxLogo" />
            <div className="luxBrandText">
              <div className="luxBrandName">Vivendas do Bosque</div>
              <div className="luxBrandSub">
                Simulador Comercial • BOMM Urbanizadora
              </div>
            </div>
          </div>

          <div className="luxRight">
            <span className="luxPill">VGV • Simulador</span>
            <img src={logoBomm} alt="BOMM Urbanizadora" className="luxLogoBomm" />
          </div>
        </div>

        <main className="luxMain">
          {erro ? <div className="alert alertDanger">{erro}</div> : null}

          <section className="luxHero">
            <div className="luxHeroKicker">{tituloModo}</div>
            <h1 className="luxTitle">Dados do Cliente</h1>
            <p className="luxHeroText">{descricaoModo}</p>
          </section>

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
                <strong>Modo atual:</strong> {modoDocumento}
              </div>
            </div>
          </section>

          <section className="luxSection">
            <div className="luxSectionInner">
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

              <div className="luxSplit">
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
                        <div className="luxMiniHint">após abatimentos</div>
                      </div>
                    </div>

                    <div className="luxSpacer" />

                    <div className="luxGrid3">
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
                        />
                        <div className="mini">Balão: {brl(valorBalao)}</div>
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

                <section className="luxSection">
                  <div className="luxSectionInner">
                    <div className="luxKicker">Resultado</div>
                    <h2 className="luxH2">Mensagem pronta para envio</h2>

                    <textarea
                      className="whats luxWhats"
                      value={mensagemWhatsApp}
                      onChange={() => {}}
                      readOnly
                    />

                    <div className="luxActions">
                      <button type="button" className="btn" onClick={copiarMensagem}>
                        {copiado ? "Copiado!" : "Copiar texto"}
                      </button>

                      <button type="button" className="btn btnGhost" onClick={gerarPdf}>
                        Gerar PDF Pro
                      </button>

                      <span className="luxHint">
                        INCC até entrega • IPCA após entrega
                      </span>
                    </div>

                    <div className="foot">
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
                        min="1"
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
                      <label>Balões semestrais</label>
                      <input
                        type="number"
                        min="1"
                        value={toInputNumber(propostaCliente.condicao.baloesSemestrais)}
                        onChange={(e) =>
                          setPropostaCliente((anterior) => ({
                            ...anterior,
                            condicao: {
                              ...anterior.condicao,
                              baloesSemestrais: Math.max(
                                1,
                                Math.round(numeroSeguro(e.target.value))
                              ),
                            },
                          }))
                        }
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
                        <label>Balões semestrais</label>
                        <input
                          type="number"
                          min="1"
                          value={toInputNumber(contrapropostaBomm.condicao.baloesSemestrais)}
                          onChange={(e) =>
                            setContrapropostaBomm((anterior) => ({
                              ...anterior,
                              condicao: {
                                ...anterior.condicao,
                                baloesSemestrais: Math.max(
                                  1,
                                  Math.round(numeroSeguro(e.target.value))
                                ),
                              },
                            }))
                          }
                        />
                      </div>
                    </div>

                    <div className="luxSpacer" />

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

              <div className="luxSplit">
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

                <section className="luxSection">
                  <div className="luxSectionInner">
                    <div className="luxKicker">Resultado</div>
                    <h2 className="luxH2">Mensagem pronta para envio</h2>

                    <textarea
                      className="whats luxWhats"
                      value={mensagemWhatsApp}
                      onChange={() => {}}
                      readOnly
                    />

                    <div className="luxActions">
                      <button type="button" className="btn" onClick={copiarMensagem}>
                        {copiado ? "Copiado!" : "Copiar texto"}
                      </button>

                      <button type="button" className="btn btnGhost" onClick={gerarPdf}>
                        Gerar PDF Pro
                      </button>

                      <span className="luxHint">
                        INCC até entrega • IPCA após entrega
                      </span>
                    </div>

                    <div className="foot">
                      Evolução atual: base pronta para proposta e contra-proposta dentro
                      do mesmo sistema.
                    </div>
                  </div>
                </section>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
