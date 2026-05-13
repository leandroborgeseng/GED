# Planejamento: editor rich text, PDF e integração GED/PAE

**Status:** planejado — não implementado.  
**Contexto:** permitir que secretarias redijam despachos ricos dentro do GED, salvar versões, exportar PDF para o acervo (Mayan) e assinar digitalmente (fluxos simples e A1 já existentes), reduzindo dependência de Word externo + upload manual.

**Stack atual de referência:** NestJS (`apps/backend`), Next.js 15 (`apps/frontend`), Mayan via `MayanService.uploadDocument`, `ProcessDocument` (SHA, `mayanDocumentId`), despacho hoje em `ProcessMovement.dispatchText` (texto plano).

---

## Objetivo do produto

- Editor **rich text** no sistema.
- **Armazenamento** de rascunhos/versões antes da publicação no GED.
- **Exportação PDF** após “finalizar”.
- **Assinatura** no mesmo pipeline já usado para anexos (`ProcessDocument` + assinatura simples ou A1 com SHA).

---

## Decisão de tecnologia (recomendação)

| Abordagem | Prós | Contras |
|-----------|------|---------|
| **TipTap ou Lexical + JSON/HTML + PDF no servidor** | Boa integração Next + Nest; sem licença extra; fluxo “salvar → PDF → Mayan” controlável. | PDF fiel ao layout pode exigir motor tipo Chromium (Puppeteer/Playwright) ou biblioteca de layout. |
| **OnlyOffice / Collabora (ODT/DOCx)** | Formato familiar; interoperabilidade com escritório. | Infra mais pesada; custo e operação maiores. |
| **Apenas melhorar upload** | Simples. | Não atende editar **dentro** do sistema. |

**MVP sugerido:** TipTap (ou Lexical) + persistência de **conteúdo estruturado (JSON)** + snapshot HTML opcional + **geração de PDF no backend** (Puppeteer/Playwright ou alternativa avaliada no deploy). **ODT/DOCx** como **fase opcional** (LibreOffice headless, `docx`, ou OnlyOffice).

---

## Fase 0 — Escopo e modelo de dados

1. Definir se o documento rico **substitui** ou **complementa** o despacho texto plano:
   - Recomendação MVP: **complemento** — manter `dispatchText` como resumo/legado onde fizer sentido; o PDF oficial vira `ProcessDocument`.
2. Novo modelo (exemplo de entidade): `ProcessRichDispatch` ou `ProcessDraftDocument`:
   - `processId`, `authorId`, `status` (`RASCUNHO` | `FINALIZADO`), `editorJson` (e/ou `html`), `version`, `title`, timestamps.
3. Ao **finalizar**: criar registro em **`ProcessDocument`** apontando para o **PDF** no Mayan (reuso do fluxo de anexos).

---

## Fase 1 — API backend (Nest)

1. CRUD de rascunho, ex.: `POST/GET/PATCH /pae/processes/:id/despacho-editor` — versionamento simples (`version++` ou histórico explícito).
2. `POST .../despacho-editor/finalizar`:
   - renderizar HTML → gerar PDF → `mayan.uploadDocument` → gravar `ProcessDocument` (`title`, `mimeType`, `sha256`, `mayanDocumentId`).
3. **Autorização:** alinhar a quem já pode despachar / anexar.
4. **Auditoria:** eventos tipo `DESPACHO_RICO_SALVO`, `DESPACHO_RICO_FINALIZADO` (padrão `ProcessAuditLog` / movimentos).

**Teste:** salvar rascunho, recarregar e comparar conteúdo; finalizar e ver novo documento na lista do processo com SHA.

---

## Fase 2 — Frontend (Next)

1. Aba ou rota no detalhe do processo: “Despacho (editor)”.
2. Toolbar mínima: negrito, itálico, listas, cabeçalhos, links; opcional: tabelas.
3. Ações: **Salvar rascunho**, **Pré-visualizar**, **Finalizar e gerar PDF** (feedback de loading/erro).
4. Pós-finalizar: atualizar lista de documentos; link para visualizar no Mayan se existir endpoint de download.

**Teste:** fluxo completo sem arquivo externo.

---

## Fase 3 — PDF e qualidade

1. Template HTML (cabeçalho: número do processo, data, autor).
2. Fontes e quebras de página; limites de tamanho/timeout.
3. Se necessário: fila/job para PDFs lentos.

**Teste:** PDF legível, texto selecionável, impressão OK.

---

## Fase 4 — Assinatura digital (encaixe)

1. Opcionalmente chamar **`solicitarAssinatura`** após finalizar, com `processDocumentId` do PDF.
2. Validar **assinatura simples** e **A1** no PDF gerado (payload A1 já usa SHA do documento vinculado).

**Teste:** pendência de assinatura correta; pós-assinatura coerente com movimentos/auditoria.

---

## Fase 5 (opcional) — ODT/DOCx

- Export DOCx/ODT via biblioteca ou LibreOffice/OnlyOffice conforme requisito formal de interoperabilidade.

---

## Checklist de testes manuais

- [ ] Isolamento por processo/tenant; usuário sem permissão não edita.
- [ ] Rascunho com texto longo e caracteres especiais/acentos.
- [ ] Política de **múltiplas finalizações**: novo arquivo vs. substituição — documentar e testar.
- [ ] PDF no Mayan com nome e metadados esperados.
- [ ] Assinatura com SHA consistente com o arquivo (quando houver download).
- [ ] Regressão: despacho **texto simples** existente continua funcionando.

---

## Ordem sugerida para validação incremental

1. Persistência + editor na UI (sem PDF).
2. PDF + Mayan + lista de documentos.
3. Assinatura no PDF.

---

## Notas para deploy / bases antes de implementar

- Garantir `MAYAN_DOCUMENT_TYPE_ID` e conectividade Mayan em ambiente de teste.
- Definir onde rodará o gerador de PDF (memória CPU, dependência Chromium no container do backend ou serviço à parte).
- Revisar limites de upload (`documents` controller) para o tamanho típico de PDF gerado.
