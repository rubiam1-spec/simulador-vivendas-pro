# 🗂️ RR CRM — Contexto do Projeto para Claude Code

> Este arquivo é lido automaticamente pelo Claude Code em toda nova sessão.
> Mantenha-o atualizado sempre que houver mudanças estruturais no projeto.

---

## 📦 Stack & Deploy

| Item | Detalhe |
|------|---------|
| Frontend | React + TypeScript + Vite |
| Backend/DB | Supabase (PostgreSQL + Auth + Storage + RLS) |
| Deploy | Vercel |
| Repositório | `rubiam1-spec/simulador-vivendas-pro` |
| URL produção | `simulador-vivendas-pro.vercel.app` |
| Cliente ativo | Bomm Urbanizadora |

---

## 🎨 Sistema de Design — LEIA ANTES DE ESCREVER CSS

### Paleta oficial (nunca use outros tons de azul)
```
#060d1a  — navy fundo profundo
#0e3fa0  — navy primário
#3070f0  — azul destaque
#6da0ff  — azul claro / accent
#ffffff  — branco texto principal
```

### Tipografia
- **Única fonte permitida:** `Inter` (sem serifas — decisão definitiva)
- Pesos usados: 400, 500, 600, 700

### Logo RR CRM
- Dois círculos sobrepostos: `#0e3fa0` (esquerdo) e `#3070f0` (direito)
- Letras "RR" em branco dentro dos círculos
- Texto "RR CRM" em Inter 600, tagline "PLATAFORMA COMERCIAL" em Inter 500 com letter-spacing

### Favicon (PENDENTE)
- Ainda mostrando logo da Bomm — substituir por ícone RR CRM
- Arquivos a alterar: `public/favicon.svg` e `index.html`

---

## ⚙️ Arquitetura CSS — Regras críticas

### ⚠️ NUNCA faça isso:
- Não crie blocos `:root` com cores hardcoded fora de `App.css`
- Não use classes `.appShellSidebar` (nome errado) — use `.appSidebar`
- Não importe fontes fora de `App.css` ou `index.html`
- Não adicione `font-family` inline em componentes

### ✅ Padrão correto:
- Todas as CSS custom properties (tokens) ficam em `App.css` no bloco `:root`
- `simulador.css` NÃO pode ter bloco `:root` próprio (causa sobrescrita de tokens)
- Troca de tema (dark/light) via CSS custom properties

---

## 🗃️ Supabase — Regras de RLS (Row Level Security)

### Padrão correto para políticas:
```sql
-- ✅ Correto
SELECT role FROM profiles WHERE profiles.user_id = auth.uid()

-- ❌ Evitar (causa bloqueio silencioso)
EXISTS (SELECT 1 FROM profiles WHERE ...)
```

### Tabelas principais:
- `negociacoes` — negociações dos corretores (RLS ativa)
- `profiles` — perfil do usuário com campo `role`
- `clientes` — cadastro de clientes

---

## 🏢 White-Label

- Clientes fazem upload do próprio logo via Supabase Storage
- Logo do cliente aparece: PDF, Simulador, Sidebar
- "Powered by RR CRM" obrigatório no rodapé dos PDFs
- Identidade RR CRM preservada no header do sistema

---

## 📁 Arquivos críticos — leia ANTES de qualquer alteração

```
src/
├── App.css                    ← tokens de tema, paleta, tipografia global
├── App.tsx                    ← roteamento principal
├── components/
│   ├── Sidebar/               ← logo RR CRM + logo cliente white-label
│   ├── Dashboard/             ← métricas com formatCurrency/formatCount
│   └── Simulador/             ← simulador de financiamento
├── utils/
│   └── formatMetric.ts        ← formatCurrency, formatCount, formatCurrencyFull
└── supabase/
    └── client.ts              ← cliente Supabase configurado
```

---

## ✅ O que já foi entregue (não refazer)

- [x] Paleta navy blue completa
- [x] Dark/light mode toggle
- [x] Logo RR CRM SVG
- [x] Bug CSS root corrigido (simulador.css sobrescrevia App.css)
- [x] Mismatch de classes CSS corrigido
- [x] RLS das `negociacoes` corrigido
- [x] White-label com logo do cliente
- [x] `formatMetric.ts` com valores abreviados (R$ 8,07M) + tooltip valor completo
- [x] Dashboard com métricas funcionando
- [x] Build e deploy no Vercel funcionando

---

## 🔴 Pendências conhecidas

- [ ] **Favicon** — trocar logo Bomm pelo ícone RR CRM em `public/favicon.svg` + `index.html`

---

## 🔮 Etapas futuras (NÃO implementar sem instrução explícita)

### Etapa 2 — Multi-usuário
- Login próprio por consultora (vê só suas negociações)
- Gestor vê tudo
- Tabela `imobiliarias` no Supabase
- Corretor vinculado à imobiliária e gerente
- Foto de perfil + nome editável
- Hierarquia de usuários no PDF

### Etapa 3
- Gerador de relatórios com filtros personalizados
- Sistema de etiquetas/tags nos clientes

### Ideias futuras
- App iOS (avaliar React Native ou PWA)
- Integração API com SGL (Sistema para Gestão de Loteamentos)

---

## 🚫 O que NUNCA fazer

1. Refatorar código que não foi pedido
2. Trocar `Inter` por qualquer outra fonte
3. Criar variáveis CSS fora do `App.css`
4. Remover o "Powered by RR CRM" do rodapé dos PDFs
5. Alterar políticas RLS sem testar localmente antes
6. Fazer push direto na branch `main` sem build bem-sucedido

---

## 🧪 Antes de qualquer PR/push

```bash
npm run build        # deve terminar sem erros
npm run type-check   # sem erros de TypeScript
```

---

*Atualizado em: Março 2026*
