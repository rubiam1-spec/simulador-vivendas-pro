import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { useAuth } from "../components/AuthProvider";
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
  const { profile } = useAuth();
  const [negociacoes, setNegociacoes] = useState<NegociacaoSalva[]>([]);
  const [feedback, setFeedback] = useState("");

  const consultoraUserId =
    profile?.role === "consultora" || profile?.role === "corretor"
      ? profile.userId
      : null;

  async function recarregar() {
    setNegociacoes(await listNegociacoes({ consultoraUserId }));
  }

  function notificar(texto: string) {
    setFeedback(texto);
    window.setTimeout(() => setFeedback(""), 3000);
  }

  useEffect(() => {
    void recarregar();
  }, []);

  async function abrir(negociacao: NegociacaoSalva) {
    agendarAberturaNegociacao(negociacao.id);
    await appendNegociacaoEvent(negociacao.id, {
      tipo: "negociacao_aberta",
      descricao: "Negociação aberta",
    });
    await recarregar();
    navigate("/simulador");
  }

  async function duplicar(id: string) {
    const duplicada = await duplicateNegociacaoById(id);
    if (!duplicada) return;
    await recarregar();
    notificar("Negociação duplicada com sucesso.");
  }

  async function excluir(id: string) {
    if (!window.confirm("Deseja excluir esta negociação?")) return;
    await deleteNegociacaoById(id);
    await recarregar();
    notificar("Negociação excluída.");
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
      | "status"
      | "etapa"
      | "prioridade"
      | "origem"
      | "observacaoInterna"
      | "ultimaAcao"
    >
  ) {
    // Atualização otimista: UI responde imediatamente
    setNegociacoes((anterior) =>
      anterior.map((neg) =>
        neg.id === id
          ? { ...neg, ...dados, updatedAt: new Date().toISOString() }
          : neg
      )
    );

    try {
      const atualizada = await updateNegociacaoById(id, dados);

      if (!atualizada) {
        // Banco rejeitou: reverte e avisa
        await recarregar();
        notificar("Erro ao salvar. Verifique sua conexão.");
        return;
      }

      // Confirma com dados reais vindos do banco
      setNegociacoes((anterior) =>
        anterior.map((neg) => (neg.id === id ? atualizada : neg))
      );

      notificar("Negociação atualizada.");

      // Sincroniza o Dashboard automaticamente
      window.dispatchEvent(
        new StorageEvent("storage", {
          key: "central_negociacoes_bomm",
        })
      );
    } catch (error) {
      // Reverte e exibe mensagem de erro clara
      await recarregar();
      notificar(
        error instanceof Error
          ? `Erro: ${error.message}`
          : "Erro desconhecido ao salvar."
      );
    }
  }

  return (
    <div className="appPageStack">
      {feedback ? (
        <div style={{
          position: "fixed",
          bottom: 28,
          right: 28,
          zIndex: 999,
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "14px 20px",
          borderRadius: "var(--r-md)",
          background: "linear-gradient(135deg, var(--clr-accent), var(--clr-accent-hi))",
          color: "#ffffff",
          fontWeight: 600,
          fontSize: "14px",
          letterSpacing: "-0.01em",
          boxShadow: "var(--shadow-lg), 0 0 0 1px rgba(48,112,240,0.3)",
          animation: "toastIn 220ms var(--ease-out)",
          fontFamily: "var(--font-sans)",
          pointerEvents: "none",
        }}>
          ✓ {feedback}
        </div>
      ) : null}

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
