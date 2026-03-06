import { useEffect, useMemo, useState } from "react";
import jsPDF from "jspdf";
import { carregarLotes, type Lote } from "../services/planilhaService";
import "./simulador.css";

import logoVivendas from "../assets/logo-vivendas.png";
import logoBomm from "../assets/logo-bomm.png";

type StatusFiltro = "todos" | "disponivel" | "indisponivel";

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

function chaveLote(lote: Lote) {
  return `${String(lote.quadra)}::${String(lote.lote)}`;
}

export default function Simulador() {
  const [lotes, setLotes] = useState<Lote[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");

  const [cliente, setCliente] = useState("");
  const [corretor, setCorretor] = useState("");
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

  const resumoNegociacao = useMemo(() => {
    const partes: string[] = [];

    partes.push(
      `• Valor total dos terrenos: ${brl(valorTerreno)}`
    );
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

  const mensagemWhatsApp = useMemo(() => {
    const linhas: string[] = [];

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
    linhas.push(`• ${baloesSemestrais} balões semestrais de ${brl(valorBalao)}`);
    linhas.push("");
    linhas.push(
      "📌 Importante: parcelas e balões são corrigidos pelo INCC durante a obra e, após a entrega, pelo IPCA."
    );

    if (corretor || imobiliaria) {
      linhas.push("");
      linhas.push("👤 Atendimento:");
      if (corretor) linhas.push(`• Corretor(a): ${corretor}`);
      if (imobiliaria) linhas.push(`• Imobiliária: ${imobiliaria}`);
    }

    return linhas.join("\n");
  }, [
    cliente,
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
    corretor,
    imobiliaria,
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
    const doc = new jsPDF({
      unit: "pt",
      format: "a4",
    });

    const margemX = 42;
    let y = 40;

    doc.setFillColor(21, 42, 34);
    doc.roundedRect(24, 24, 547, 794, 18, 18, "F");

    try {
      doc.addImage(logoVivendas, "PNG", margemX, y, 88, 28);
      doc.addImage(logoBomm, "PNG", 470, y + 2, 60, 22);
    } catch {
      // segue sem imagem se falhar
    }

    y += 48;

    doc.setTextColor(245, 245, 245);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.text("Simulação Comercial", margemX, y);

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

    doc.save("simulacao-vivendas-multiplos-lotes.pdf");
  }

  return (
    <div className="simPage">
      <div className="luxWrap">
        <div className="luxTopbar">
          <div className="luxBrand">
            <img src={logoVivendas} alt="Vivendas do Bosque" className="luxLogo" />
            <div className="luxBrandText">
              <div className="luxBrandName">Vivendas do Bosque</div>
              <div className="luxBrandSub">Simulador Comercial • BOMM Urbanizadora</div>
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
            <div className="luxHeroKicker">Nova simulação</div>
            <h1 className="luxTitle">Dados do Cliente</h1>
            <p className="luxHeroText">
              Um ambiente comercial claro, rápido e confiável para gerar simulações com
              segurança e boa experiência em qualquer tela.
            </p>
          </section>

          <section className="luxSection">
            <div className="luxSectionInner">
              <div className="luxGrid2">
                <div className="luxField">
                  <label>Cliente</label>
                  <input
                    value={cliente}
                    onChange={(e) => setCliente(e.target.value)}
                    placeholder="Nome do cliente"
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
                        setParcelasMeses(Math.max(1, Math.round(numeroSeguro(e.target.value))))
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
                        setBaloesSemestrais(Math.max(1, Math.round(numeroSeguro(e.target.value))))
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
                    <span>• Nenhuma unidade selecionada<br /></span>
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

                  <span className="luxHint">INCC até entrega • IPCA após entrega</span>
                </div>

                <div className="foot">
                  Próximas evoluções: histórico de simulações • modos de atendimento • propostas comerciais avançadas
                </div>
              </div>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}