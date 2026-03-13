import { useEffect, useState } from "react";

import DashboardComercial from "../components/DashboardComercial";
import { listarNegociacoesSalvas } from "../services/negociacoesStorage";
import type { NegociacaoSalva } from "../types/negociacao";

export default function DashboardPage() {
  const [negociacoes, setNegociacoes] = useState<NegociacaoSalva[]>([]);

  useEffect(() => {
    setNegociacoes(listarNegociacoesSalvas());
  }, []);

  return (
    <div className="appPageStack">
      <DashboardComercial negociacoes={negociacoes} />
    </div>
  );
}
