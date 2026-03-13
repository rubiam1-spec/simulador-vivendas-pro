import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import CentralNegociacoes from "../components/CentralNegociacoes";
import { gerarPdfDaNegociacaoSalva } from "../services/negociacoesMapper";
import { agendarAberturaNegociacao } from "../services/negociacoesSession";
import {
  adicionarEventoNegociacao,
  atualizarNegociacao,
  duplicarNegociacao,
  excluirNegociacao,
  listarNegociacoesSalvas,
} from "../services/negociacoesStorage";
import type { NegociacaoSalva } from "../types/negociacao";

export default function CentralNegociacoesPage() {
  const navigate = useNavigate();
  const [negociacoes, setNegociacoes] = useState<NegociacaoSalva[]>([]);
  const [feedback, setFeedback] = useState("");

  function recarregar() {
    setNegociacoes(listarNegociacoesSalvas());
  }

  function notificar(texto: string) {
    setFeedback(texto);
    window.setTimeout(() => setFeedback(""), 2200);
  }

  useEffect(() => {
    recarregar();
  }, []);

  function abrir(negociacao: NegociacaoSalva) {
    agendarAberturaNegociacao(negociacao.id);
    adicionarEventoNegociacao(negociacao.id, {
      tipo: "negociacao_aberta",
      descricao: "Negociacao aberta",
    });
    recarregar();
    navigate("/simulador");
  }

  function duplicar(id: string) {
    const duplicada = duplicarNegociacao(id);
    if (!duplicada) return;
    recarregar();
    notificar("Negociacao duplicada com sucesso.");
  }

  function excluir(id: string) {
    if (!window.confirm("Deseja excluir esta negociacao?")) return;
    excluirNegociacao(id);
    recarregar();
    notificar("Negociacao excluida.");
  }

  function gerarPdf(negociacao: NegociacaoSalva) {
    gerarPdfDaNegociacaoSalva(negociacao);
    adicionarEventoNegociacao(negociacao.id, {
      tipo: "pdf_gerado",
      descricao: "PDF gerado",
    });
    recarregar();
    notificar("PDF gerado.");
  }

  function atualizarDadosComerciais(
    id: string,
    dados: Pick<
      NegociacaoSalva,
      "status" | "prioridade" | "origem" | "observacaoInterna" | "ultimaAcao"
    >
  ) {
    const atualizada = atualizarNegociacao(id, dados);
    if (!atualizada) return;
    recarregar();
    notificar("Dados comerciais atualizados.");
  }

  return (
    <div className="appPageStack">
      {feedback ? <div className="appInlineFeedback">{feedback}</div> : null}

      <CentralNegociacoes
        negociacoes={negociacoes}
        negociacaoAtivaId={null}
        onAbrir={abrir}
        onDuplicar={duplicar}
        onExcluir={excluir}
        onGerarPdf={gerarPdf}
        onAtualizarDadosComerciais={atualizarDadosComerciais}
      />
    </div>
  );
}
