type ModulePlaceholderProps = {
  moduleName: string;
  description: string;
};

export default function ModulePlaceholder({
  moduleName,
  description,
}: ModulePlaceholderProps) {
  return (
    <div className="crmStack">
      <section className="crmSection">
        <div className="crmEmptyState">
          <span className="crmBadge">Planejamento CRM</span>
          <h3>{moduleName}</h3>
          <p>{description}</p>
        </div>
      </section>

      <div className="crmPanelGrid">
        <section className="crmPanel">
          <div className="crmPanelHead">
            <div>
              <h3 className="crmPanelTitle">Base estrutural pronta</h3>
              <p className="crmPanelDescription">
                A navegação, o shell global e o padrão visual já consideram este
                módulo para a evolução do CRM.
              </p>
            </div>
          </div>

          <div className="crmDataGrid">
            <div className="crmDataItem">
              <span className="crmDataLabel">Status</span>
              <strong className="crmDataValue">Em preparação</strong>
            </div>
            <div className="crmDataItem">
              <span className="crmDataLabel">Objetivo</span>
              <strong className="crmDataValue">Expansão modular do CRM</strong>
            </div>
          </div>
        </section>

        <section className="crmPanel">
          <div className="crmPanelHead">
            <div>
              <h3 className="crmPanelTitle">Próximos passos sugeridos</h3>
            </div>
          </div>

          <div className="crmInlineList">
            <div className="crmInlineListItem">Definir entidade e campos principais.</div>
            <div className="crmInlineListItem">Conectar filtros, cards e histórico.</div>
            <div className="crmInlineListItem">Integrar ao funil comercial existente.</div>
          </div>
        </section>
      </div>
    </div>
  );
}
