import { type FormEvent, useEffect, useState } from "react";

import {
  createImobiliaria,
  deleteImobiliaria,
  listAllImobiliarias,
  updateImobiliaria,
  type Imobiliaria,
  type CreateImobiliariaInput,
} from "../services/imobiliariasService";

function emptyForm(): CreateImobiliariaInput {
  return { nome: "", cnpj: "", telefone: "", email: "", ativo: true };
}

function formatCnpj(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 14);
  return d
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2");
}

export default function ImobiliariasPage() {
  const [imobiliarias, setImobiliarias] = useState<Imobiliaria[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<CreateImobiliariaInput>(emptyForm());

  async function load() {
    try {
      setLoading(true);
      setImobiliarias(await listAllImobiliarias());
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao carregar.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  function handleNew() {
    setEditingId(null);
    setForm(emptyForm());
    setShowForm(true);
    setFeedback("");
    setError("");
  }

  function handleEdit(imob: Imobiliaria) {
    setEditingId(imob.id);
    setForm({
      nome: imob.nome,
      cnpj: imob.cnpj,
      telefone: imob.telefone,
      email: imob.email,
      ativo: imob.ativo,
    });
    setShowForm(true);
    setFeedback("");
    setError("");
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Deseja excluir esta imobiliária?")) return;
    try {
      await deleteImobiliaria(id);
      setImobiliarias((prev) => prev.filter((i) => i.id !== id));
      setFeedback("Imobiliária excluída.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao excluir.");
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setFeedback("");
    setError("");

    try {
      if (editingId) {
        const updated = await updateImobiliaria(editingId, form);
        setImobiliarias((prev) =>
          prev.map((i) => (i.id === editingId ? updated : i))
        );
        setFeedback("Imobiliária atualizada.");
      } else {
        const created = await createImobiliaria(form);
        setImobiliarias((prev) => [created, ...prev]);
        setFeedback("Imobiliária cadastrada.");
      }
      setForm(emptyForm());
      setEditingId(null);
      setShowForm(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="crmStack">
      <section className="crmSection crmFilterShell">
        <div className="crmSectionHeader">
          <div>
            <span className="crmSectionEyebrow">Administração</span>
            <h2 className="crmSectionTitle">Imobiliárias parceiras</h2>
            <p className="crmSectionText">
              Cadastre e gerencie as imobiliárias vinculadas aos corretores do CRM.
            </p>
          </div>
          <div className="crmToolbarActions">
            <button type="button" className="btn" onClick={handleNew}>
              Nova imobiliária
            </button>
          </div>
        </div>
      </section>

      {feedback ? <div className="appInlineFeedback">{feedback}</div> : null}
      {error ? <div className="loginError">{error}</div> : null}

      <div className="crmAccessGrid crmEntityGrid">
        <section
          className={["crmPanel", "crmPanelExpandable", showForm ? "isOpen" : ""].join(" ").trim()}
        >
          <div className="crmPanelHead">
            <div>
              <h3 className="crmPanelTitle">
                {editingId ? "Editar imobiliária" : "Cadastro de imobiliária"}
              </h3>
            </div>
            {!showForm ? (
              <button type="button" className="btn btnGhost" onClick={handleNew}>
                Abrir formulário
              </button>
            ) : null}
          </div>

          {showForm ? (
            <form className="crmAccessForm" onSubmit={(e) => void handleSubmit(e)}>
              <label className="crmField">
                <span>Nome da imobiliária *</span>
                <input
                  value={form.nome}
                  onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
                  required
                />
              </label>

              <div className="crmAccessFormSplit">
                <label className="crmField">
                  <span>CNPJ</span>
                  <input
                    value={form.cnpj}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, cnpj: formatCnpj(e.target.value) }))
                    }
                    placeholder="00.000.000/0000-00"
                  />
                </label>
                <label className="crmField">
                  <span>Telefone</span>
                  <input
                    value={form.telefone}
                    onChange={(e) => setForm((f) => ({ ...f, telefone: e.target.value }))}
                  />
                </label>
              </div>

              <div className="crmAccessFormSplit">
                <label className="crmField">
                  <span>E-mail</span>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  />
                </label>
                <label className="crmField">
                  <span>Status</span>
                  <select
                    value={form.ativo ? "ativo" : "inativo"}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, ativo: e.target.value === "ativo" }))
                    }
                  >
                    <option value="ativo">Ativa</option>
                    <option value="inativo">Inativa</option>
                  </select>
                </label>
              </div>

              <div className="crmButtonRow">
                <button type="submit" className="btn" disabled={saving}>
                  {saving ? "Salvando..." : editingId ? "Salvar alterações" : "Cadastrar"}
                </button>
                <button
                  type="button"
                  className="btn btnGhost"
                  onClick={() => {
                    setShowForm(false);
                    setEditingId(null);
                    setForm(emptyForm());
                  }}
                >
                  Cancelar
                </button>
              </div>
            </form>
          ) : (
            <div className="crmEmptyState">
              <span className="crmBadge">Cadastro</span>
              <h3>Abrir formulário de imobiliária</h3>
              <p>Vincule imobiliárias aos corretores do CRM.</p>
            </div>
          )}
        </section>

        <section className="crmPanel">
          <div className="crmPanelHead">
            <div>
              <h3 className="crmPanelTitle">Imobiliárias cadastradas</h3>
              <p className="crmPanelDescription">
                {imobiliarias.length} registro(s) encontrado(s).
              </p>
            </div>
          </div>

          {loading ? (
            <div className="appShellLoadingInline">Carregando imobiliárias...</div>
          ) : imobiliarias.length === 0 ? (
            <div className="crmEmptyState crmEntityEmpty">
              <span className="crmBadge">Sem registros</span>
              <h3>Nenhuma imobiliária cadastrada</h3>
              <p>Cadastre a primeira para vincular aos corretores.</p>
            </div>
          ) : (
            <div className="crmEntityList">
              {imobiliarias.map((imob) => (
                <article
                  key={imob.id}
                  className={[
                    "crmEntityCard",
                    imob.id === editingId ? "isActive" : "",
                  ].join(" ").trim()}
                >
                  <div className="crmEntityHeader">
                    <div className="crmAccessIdentity">
                      <span className="crmDealOverline">Imobiliária</span>
                      <h3>{imob.nome}</h3>
                      {imob.cnpj ? <p>{imob.cnpj}</p> : null}
                    </div>
                    <div className="crmDealStatus">
                      <span className={`crmBadge ${imob.ativo ? "isSuccess" : "isMuted"}`}>
                        {imob.ativo ? "Ativa" : "Inativa"}
                      </span>
                    </div>
                  </div>

                  <div className="crmDealMetaGrid crmEntityMetaGrid">
                    <div className="crmDealMetaItem">
                      <span className="crmDealMetaLabel">Telefone</span>
                      <strong>{imob.telefone || "—"}</strong>
                    </div>
                    <div className="crmDealMetaItem">
                      <span className="crmDealMetaLabel">E-mail</span>
                      <strong>{imob.email || "—"}</strong>
                    </div>
                  </div>

                  <div className="crmButtonRow">
                    <button
                      type="button"
                      className="btn btnGhost"
                      onClick={() => handleEdit(imob)}
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      className="btn btnGhost"
                      onClick={() => void handleDelete(imob.id)}
                    >
                      Excluir
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
