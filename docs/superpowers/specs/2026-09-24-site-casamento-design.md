# Site de Casamento — Gustavo & Caroline — Design

**Data:** 2026-09-24
**Status:** aprovado em conversa, aguardando revisão do documento

## Objetivo

Site de casamento de página única com lista de presentes fictícios em modelo de cotas. Ao presentear, o convidado recebe um QR Code PIX com o valor exato, paga pelo app do banco e deixa um recado privado para o casal. O público vê cotas vendidas e presentes esgotados; só o casal lê os recados.

## Dados do evento (fonte: convite)

- **Noivos:** Gustavo Gaioski e Caroline Sabião da Silva (exibição curta: "Gustavo & Caroline", monograma "G & C")
- **Data:** 12 de dezembro de 2026, às 10:30 (America/Sao_Paulo)
- **Versículo:** "Sim, coisas grandiosas fez o Senhor por nós, por isso estamos alegres." — Salmos 126:3
- **Frase de abertura:** "Com a Benção de Deus e de seus Pais convidam para o sacramento de seu matrimônio"
- **Cerimônia:** Santuário Divina Misericórdia — Estr. do Ganchinho, nº 570 – Umbará, Curitiba – PR, 81930-165
- **Recepção:** Salão Pátio 74 — Rua Eponino Macuco, 74 – Capão Raso, Curitiba – PR, 81110-450

## Arquitetura

```
Convidado ──► GitHub Pages (HTML/CSS/JS estático, sem build)
                 │ GET  ?action=presentes   → lista + cotas vendidas (sem recados)
                 │ POST action=contribuir   → registra contribuição + recado
                 ▼
          Google Apps Script (Web App, "Executar como: eu", acesso: qualquer pessoa)
                 ▼
          Google Sheets privado (Drive do casal)
            ├─ aba "Presentes"      ← painel de administração
            └─ aba "Contribuicoes"  ← registros e recados (privado)
```

- **Repositório:** `gustavo-inteknet/casamento`, público (requisito do GitHub Pages no plano gratuito). Nenhum dado sensível no código.
- **Sem etapa de build:** HTML, CSS e JS puros (ES modules). Bibliotecas externas apenas via cdnjs.
- **Domínio próprio futuro:** todos os caminhos relativos; README documenta arquivo `CNAME` + registros DNS (A/AAAA para GitHub Pages ou CNAME para `gustavo-inteknet.github.io`).

## Estrutura de arquivos

```
index.html              página principal
presente.html           página de presentear (?id=<id>)
css/style.css           estilos globais (tokens de cor/tipografia)
js/config.js            chave PIX, nome recebedor, cidade, URL do Apps Script
js/format.js            moeda, valor da cota, parse, escape HTML (puro)
js/contagem.js          cálculo da contagem regressiva (puro)
js/pix.js               geração do payload BR Code (puro, testável)
js/api.js               chamadas ao Apps Script (GET lista, POST contribuição)
js/exemplo.js           dados do modo demonstração
js/ui.js                banner do modo demonstração
js/home.js              contagem regressiva + render da lista
js/presente.js          fluxo da página de presentear
js/icons.js             ícones SVG dos presentes (mapa id-ícone → SVG)
assets/                 ornamentos SVG, imagem Open Graph, favicon, placeholders
apps-script/Code.gs     código do backend (colado manualmente no Apps Script)
tests/*.test.js         testes com `node --test` (format, contagem, pix, backend via node:vm)
README.md               publicação, configuração da planilha, domínio próprio
```

## Página principal (`index.html`)

Menu fixo com âncoras: Início · O Casal · O Evento · Presentes.

1. **Hero:** monograma, "Gustavo & Caroline" em script, data, contagem regressiva (dias/horas/minutos/segundos) até 2026-12-12T10:30-03:00. Após a data, exibe "Hoje é o grande dia!" / "Obrigado por celebrar conosco".
2. **Versículo:** Salmos 126:3 com ornamento de corações entrelaçados.
3. **O Casal:** foto placeholder + texto placeholder claramente marcado para substituição.
4. **O Evento:** dois cartões (Cerimônia / Recepção) com nome, endereço, horário e botões "Google Maps" e "Waze" (links de busca por endereço).
5. **Lista de Presentes:** texto explicativo do modelo de cotas; grid de cartões (ícone, nome, descrição curta, valor da cota, barra "X de Y cotas", botão "Presentear"). Presentes esgotados: selo "Esgotado", botão desabilitado, ordenados ao final. Presente de valor livre destacado sem barra.
6. **Rodapé:** "Gustavo & Caroline · 12.12.2026 · Feito com amor".

## Página de presentear (`presente.html?id=<id>`)

Estados sequenciais na mesma página:

1. **Escolha:** ícone, nome, descrição, valor da cota, cotas restantes. Seletor de quantidade (1 até restantes), total calculado. Valor livre: campo monetário (mínimo R$ 1,00).
2. **Pagamento:** QR Code PIX com valor exato; botão "Copiar código Pix" (feedback "Copiado!"); nome do recebedor visível ("Confira se o recebedor é <NOME>"); instrução "Abra o app do seu banco → Pix → Ler QR Code". Botão "Já fiz o PIX".
3. **Recado:** campos Nome (obrigatório, até 80 caracteres) e Recado (opcional, até 1000 caracteres). Botão "Enviar". Aviso: "Seu recado será lido apenas pelos noivos."
4. **Obrigado:** mensagem de agradecimento + botão "Voltar à lista".

Casos: `id` inexistente ou inativo → mensagem + link para a lista. Presente esgotado → mensagem, sem QR. Cotas esgotadas entre a escolha e o envio (o convidado já pagou) → o backend **registra mesmo assim** com `observacao = "excedente"` e responde `{ ok: true, excedente: true }`; a página agradece normalmente. O recado nunca se perde; o casal vê a marcação na planilha.

## PIX (BR Code estático)

- Payload EMV conforme Manual de Padrões para Iniciação do Pix (Bacen): campos 00 (formato), 26 (GUI `br.gov.bcb.pix` + chave), 52 (`0000`), 53 (`986`), 54 (valor, 2 casas, ponto decimal), 58 (`BR`), 59 (nome recebedor, ≤25, sem acento), 60 (cidade, ≤15, sem acento), 62 (txid `***`), 63 (CRC16-CCITT-FALSE, hex maiúsculo).
- Normalização: remover acentos e caracteres fora do permitido; truncar nome/cidade.
- `config.js` guarda **chave aleatória** do Nubank (nunca CPF/telefone), nome e cidade.
- QR renderizado com biblioteca do cdnjs (ex.: `qrcode-generator`).
- **Testes:** `tests/pix.test.js` (Node) valida CRC16 contra vetor conhecido e estrutura do payload; teste manual lendo o QR no app Nubank (confere valor e recebedor sem pagar).

## Backend (Apps Script + Sheets)

### Aba `Presentes` (painel de administração)

| coluna | tipo | descrição |
|---|---|---|
| id | texto | identificador único, sem espaços (ex.: `passagens`) |
| nome | texto | nome exibido |
| descricao | texto | frase curta |
| icone | texto | chave do ícone em `icons.js` (ou vazio) |
| imagem | URL | opcional; se preenchida, substitui o ícone |
| valor_total | número | R$ total (0 = valor livre) |
| qtd_cotas | inteiro | número de cotas (0 = valor livre) |
| ativo | checkbox | desmarcado = oculto no site |
| ordem | inteiro | ordenação na lista |

Valor da cota = `valor_total / qtd_cotas`, arredondado a 2 casas.

### Aba `Contribuicoes`

| data_hora | presente_id | presente_nome | cotas | valor | nome | recado | observacao |

Cotas vendidas por presente = soma da coluna `cotas`, limitada a `qtd_cotas` na exibição. Apagar uma linha devolve a cota.

### Endpoints

- `GET ?action=presentes` → `{ ok: true, presentes: [{ id, nome, descricao, icone, imagem, valor_total, qtd_cotas, valor_cota, cotas_vendidas, livre, esgotado }] }` — somente ativos, ordenados; **nunca** retorna recados ou nomes.
- `POST` (corpo `text/plain` com JSON, para evitar preflight CORS) `{ action: "contribuir", id, cotas, valor, nome, recado }` → `{ ok: true }` ou `{ ok: false, erro: "<codigo>" }`.

### Validações no servidor

- Presente existe e está ativo.
- Cotas inteiras entre 1 e `qtd_cotas`. Se exceder as restantes (corrida ou esgotado após a escolha), grava com `observacao = "excedente"` em vez de recusar. Leitura e gravação dentro de `LockService`.
- Valor livre: número entre 1 e 100000.
- Nome 1–80 caracteres; recado ≤ 1000; remover caracteres de controle; prefixar `'` em valores que comecem com `=`, `+`, `-`, `@` (evitar injeção de fórmula na planilha).
- Códigos de erro: `nao_encontrado`, `cotas_invalidas`, `valor_invalido`, `nome_invalido`, `recado_invalido`, `acao_invalida`, `erro_interno`.

## Lista inicial de presentes

| ordem | id | nome | valor_total | qtd_cotas |
|---|---|---|---|---|
| 1 | passagens | Passagens da lua de mel | 3000 | 30 |
| 2 | hotel | Diárias num hotel pé na areia | 2400 | 24 |
| 3 | jantar | Jantar romântico à luz de velas | 600 | 6 |
| 4 | barco | Passeio de barco ao pôr do sol | 500 | 10 |
| 5 | geladeira | Geladeira nova (que não faz barulho) | 4000 | 40 |
| 6 | sofa | Sofá para maratonar séries | 3000 | 30 |
| 7 | airfryer | Air fryer para o noivo aprender a cozinhar | 500 | 10 |
| 8 | cafe | Máquina de café para sobreviver às segundas | 800 | 16 |
| 9 | churrasco | Kit churrasco para os domingos em família | 400 | 8 |
| 10 | mercado | Primeira compra do mercado a dois | 300 | 6 |
| 11 | plantinha | Plantinha para testar se estamos prontos para um pet | 100 | 2 |
| 12 | pizza | Pizza de reconciliação da primeira briga | 150 | 3 |
| 13 | sogra | Seguro contra a sogra | 250 | 5 |
| 14 | livre | Contribua com o que o coração mandar | 0 | 0 |

O `Code.gs` inclui uma função `configurarPlanilha()` que cria as abas, cabeçalhos e esta lista inicial.

## Identidade visual

- **Cores:** fundo creme `#f5f1e8` com textura sutil de papel; azul-marinho `#1f2d4d` (texto e títulos); azul-acinzentado `#5b7083` (ornamentos, detalhes); linhas finas marinho. Tema claro apenas (fidelidade ao convite).
- **Tipografia (Google Fonts):** *Pinyon Script* (nomes, títulos de seção), *Cormorant Garamond* (texto), rótulos em versalete com espaçamento largo.
- **Ornamentos:** ramos de folhas em SVG nos cantos (inspirados no convite), divisores com linha + ícone central (corações, calendário, igreja, taças, alianças).
- **Ícones dos presentes:** SVG traço fino marinho, um por presente, estilo consistente.
- **Responsivo:** mobile first, gutter 16px, sem rolagem horizontal; grid 1 coluna (mobile), 2 (tablet), 3 (desktop).
- **Compartilhamento:** meta tags Open Graph (título, descrição, imagem) para preview no WhatsApp.
- **Acessibilidade:** contraste AA, `alt` em imagens, foco visível, botões com rótulos.

## Tratamento de erros

- Falha no GET da lista → mensagem "Não conseguimos carregar a lista agora. Tente novamente em instantes." + botão "Tentar novamente".
- Falha no POST → mantém texto digitado, mostra erro e botão "Tentar novamente".
- `config.js` sem URL do Apps Script → **modo demonstração**: usa dados locais de exemplo, não grava nada e exibe banner + aviso no console. Sem chave PIX → erro visível ao tentar gerar o QR.

## Segurança

| Risco | Impacto | Mitigação |
|---|---|---|
| Chave PIX pública no código | Exposição de dado pessoal se for CPF/telefone | Usar chave aleatória |
| Clone do site com outra chave | Convidados pagam a golpista | Divulgar só o link oficial; nome do recebedor visível |
| POST forjado (URL do script visível) | Cotas marcadas indevidamente / spam | Validações, limites de tamanho, lock; casal apaga linhas |
| Injeção de fórmula na planilha | Execução de fórmula ao abrir | Prefixo `'` em valores iniciados por `= + - @` |
| Recados vazarem | Quebra de privacidade | GET nunca retorna recados; planilha privada |

Recomendações dependem do contexto; revisar se o cenário mudar.

## Tarefas do casal (guiadas no README)

1. Criar chave PIX aleatória no Nubank.
2. Criar planilha, colar `Code.gs`, executar `configurarPlanilha()`, publicar como Web App, copiar URL para `config.js`.
3. Substituir placeholders (fotos, história).

## Fora do escopo

- RSVP / confirmação de presença.
- Confirmação automática de pagamento (exigiria API bancária paga).
- Tela de administração no site (o painel é a planilha).
- Tema escuro, multi-idioma.
