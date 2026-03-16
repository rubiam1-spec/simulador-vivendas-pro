import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import CentralNegociacoes from "../components/CentralNegociacoes";
import { gerarPdfDaNegociacaoSalva } from "../services/negociacoesMapper";
import {
  appendNegociacaoEvent,
  deleteNegociacaoById,
  duplicateNegociacaoById,
  listNegociacoes,
  updateNegociacaoById,
} from "../services/negociacoesService";
import { agendarAberturaNegociacao } from "../services/negociacoesSession";
import type { NegociacaoSalva } from "../types/negociacao";

export default function CentralNegociacoesPage() {
  const navigate = useNavigate();
  const [negociacoes, setNegociacoes] = useState<NegociacaoSalva[]>([]);
  const [feedback, setFeedback] = useState("");

  async function recarregar() {
    setNegociacoes(await listNegociacoes());
  }

  function notificar(texto: string) {
    setFeedback(texto);
    window.setTimeout(() => setFeedback(""), 2200);
  }

  useEffect(() => {
    void recarregar();
  }, []);

  async function abrir(negociacao: NegociacaoSalva) {
    agendarAberturaNegociacao(negociacao.id);
    await appendNegociacaoEvent(negociacao.id, {
      tipo: "negociacao_aberta",
      descricao: "Negociacao aberta",
    });
    await recarregar();
    navigate("/simulador");
  }

  async function duplicar(id: string) {
    const duplicada = await duplicateNegociacaoById(id);
    if (!duplicada) return;
    await recarregar();
    notificar("Negociacao duplicada com sucesso.");
  }

  async function excluir(id: string) {
    if (!window.confirm("Deseja excluir esta negociacao?")) return;
    await deleteNegociacaoById(id);
    await recarregar();
    notificar("Negociacao excluida.");
  }

  async function gerarPdf(negociacao: NegociacaoSalva) {
    gerarPdfDaNegociacaoSalva(negociacao);
    await appendNegociacaoEvent(negociacao.id, {
      tipo: "pdf_gerado",
      descricao: "PDF gerado",
    });
    await recarregar();
    notificar("PDF gerado.");
  }

  async function atualizarDadosComerciais(
    id: string,
    dados: Pick<
      NegociacaoSalva,
      "status" | "etapa" | "prioridade" | "origem" | "observacaoInterna" | "ultimaAcao"
    >
  ) {
    const atualizada = await updateNegociacaoById(id, dados);
    if (!atualizada) return;
    await recarregar();
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
