# Site de Casamento Gustavo & Caroline — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Site estático de casamento (GitHub Pages) com lista de presentes em cotas, QR Code PIX por presente e recados privados gravados em Google Sheets via Apps Script.

**Architecture:** HTML/CSS/JS puros (ES modules, sem build) servidos pelo GitHub Pages. Lógica pura (PIX, formatação, contagem, regras do backend) isolada em módulos testados com `node --test`. Backend = Google Apps Script vinculado a uma planilha: `GET ?action=presentes` devolve presentes + cotas vendidas; `POST` grava contribuição e recado. Sem `apiUrl` configurada, o site roda em **modo demonstração** com dados locais.

**Tech Stack:** HTML5, CSS3, JavaScript ES2020 modules, `qrcode-generator` 1.4.4 (cdnjs), Google Fonts (Pinyon Script, Cormorant Garamond), Google Apps Script (V8), Node 24 (`node --test`) para testes, Python `http.server` para preview local, GitHub CLI para publicação.

**Spec:** `docs/superpowers/specs/2026-09-24-site-casamento-design.md`

## Global Constraints

- Idioma da interface: português do Brasil.
- Sem etapa de build; scripts externos **apenas** de `cdnjs.cloudflare.com`; fontes **apenas** do Google Fonts.
- Todos os caminhos internos relativos (preparado para domínio próprio).
- Cores: creme `#f5f1e8`, marinho `#1f2d4d`, azul-acinzentado `#5b7083`. Tema claro apenas.
- Data do casamento: `2026-12-12T10:30:00-03:00`.
- Chave PIX: **chave aleatória** (nunca CPF/telefone). Nome recebedor ≤ 25 caracteres, cidade ≤ 15, sem acento.
- GET da API **nunca** retorna nomes ou recados de convidados.
- Nome do convidado 1–80 caracteres; recado ≤ 1000; valor livre entre 1 e 100000.
- Mobile first: gutter 16px, sem rolagem horizontal em 375px; alvos de toque ≥ 44px.
- Commits terminam com `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## File Structure

```
index.html              página principal (hero, versículo, casal, evento, presentes)
presente.html           fluxo de presentear (?id=)
.nojekyll               desativa Jekyll no GitHub Pages
package.json            "type": "module" + script de teste
.claude/launch.json     preview local (python http.server :8080)
css/style.css           todos os estilos
js/config.js            chave PIX, recebedor, cidade, apiUrl, data
js/format.js            formatarMoeda, valorCota, parseMoeda, escapeHtml (puro)
js/contagem.js          calcularContagem (puro)
js/pix.js               crc16, normalizar, gerarPayloadPix (puro)
js/icons.js             ICONES, iconeSvg, preencherIcones
js/exemplo.js           PRESENTES_EXEMPLO (modo demonstração)
js/api.js               modoDemo, listarPresentes, obterPresente, enviarContribuicao
js/ui.js                mostrarBannerDemo
js/home.js              contagem regressiva + grid de presentes
js/presente.js          máquina de estados da página de presentear
assets/ramo.svg         ornamento de folhas
assets/papel.svg        textura de papel
assets/favicon.svg      monograma
assets/og.html          fonte da imagem de compartilhamento
assets/og.png           imagem Open Graph 1200×630 (gerada)
apps-script/Code.gs     backend
tests/format.test.js
tests/contagem.test.js
tests/pix.test.js
tests/backend.test.js   carrega Code.gs via node:vm
README.md
```

---

### Task 1: Scaffold + utilitários de formatação e contagem

**Files:**
- Create: `package.json`, `.nojekyll`, `.gitignore`, `.claude/launch.json`, `js/format.js`, `js/contagem.js`
- Test: `tests/format.test.js`, `tests/contagem.test.js`

**Interfaces:**
- Produces:
  - `formatarMoeda(valor: number): string` → `"R$ 1.234,56"` (espaço pode ser NBSP)
  - `valorCota(total: number, qtd: number): number` → arredondado a 2 casas
  - `parseMoeda(texto: string): number` → número ou `NaN`; aceita `"50"`, `"50,5"`, `"1.234,56"`, `"R$ 10,00"`
  - `escapeHtml(texto: any): string`
  - `calcularContagem(alvoMs: number, agoraMs: number)` → `{ fase: 'antes', dias, horas, minutos, segundos }` | `{ fase: 'hoje' }` | `{ fase: 'depois' }`; `'hoje'` dura 13,5 h após o alvo (até 23:59 do dia).

- [ ] **Step 1: Criar arquivos de scaffold**

`package.json`:
```json
{
  "name": "casamento",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "node --test",
    "serve": "python -m http.server 8080"
  }
}
```

`.nojekyll`: arquivo vazio.

`.gitignore`:
```
node_modules/
.DS_Store
Thumbs.db
```

`.claude/launch.json`:
```json
{
  "version": "0.0.1",
  "configurations": [
    {
      "name": "site",
      "runtimeExecutable": "python",
      "runtimeArgs": ["-m", "http.server", "8080"],
      "port": 8080
    }
  ]
}
```

- [ ] **Step 2: Escrever testes que falham**

`tests/format.test.js`:
```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatarMoeda, valorCota, parseMoeda, escapeHtml } from '../js/format.js';

const semNbsp = (s) => s.replace(/\s/g, ' ');

test('formatarMoeda usa padrão brasileiro', () => {
  assert.equal(semNbsp(formatarMoeda(1234.5)), 'R$ 1.234,50');
  assert.equal(semNbsp(formatarMoeda(100)), 'R$ 100,00');
});

test('valorCota divide e arredonda a 2 casas', () => {
  assert.equal(valorCota(3000, 30), 100);
  assert.equal(valorCota(100, 3), 33.33);
});

test('parseMoeda aceita formatos comuns', () => {
  assert.equal(parseMoeda('50'), 50);
  assert.equal(parseMoeda('50,5'), 50.5);
  assert.equal(parseMoeda('1.234,56'), 1234.56);
  assert.equal(parseMoeda('R$ 10,00'), 10);
  assert.equal(parseMoeda(' 7 '), 7);
});

test('parseMoeda rejeita entradas inválidas', () => {
  assert.ok(Number.isNaN(parseMoeda('')));
  assert.ok(Number.isNaN(parseMoeda('abc')));
  assert.ok(Number.isNaN(parseMoeda('10,999')));
  assert.ok(Number.isNaN(parseMoeda('-5')));
});

test('escapeHtml neutraliza HTML', () => {
  assert.equal(escapeHtml('<b>"a" & \'b\'</b>'), '&lt;b&gt;&quot;a&quot; &amp; &#39;b&#39;&lt;/b&gt;');
  assert.equal(escapeHtml(null), '');
});
```

`tests/contagem.test.js`:
```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calcularContagem } from '../js/contagem.js';

const alvo = Date.parse('2026-12-12T10:30:00-03:00');
const H = 3600 * 1000;

test('antes do casamento decompõe o tempo restante', () => {
  const agora = alvo - (2 * 24 * H + 3 * H + 4 * 60 * 1000 + 5 * 1000);
  assert.deepEqual(calcularContagem(alvo, agora), { fase: 'antes', dias: 2, horas: 3, minutos: 4, segundos: 5 });
});

test('no momento e durante o dia é "hoje"', () => {
  assert.deepEqual(calcularContagem(alvo, alvo), { fase: 'hoje' });
  assert.deepEqual(calcularContagem(alvo, alvo + 13 * H), { fase: 'hoje' });
});

test('depois do dia é "depois"', () => {
  assert.deepEqual(calcularContagem(alvo, alvo + 14 * H), { fase: 'depois' });
});
```

- [ ] **Step 3: Rodar e confirmar falha**

Run: `npm test`
Expected: FAIL — `Cannot find module '.../js/format.js'` e `.../js/contagem.js`.

- [ ] **Step 4: Implementar**

`js/format.js`:
```js
const moeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

export function formatarMoeda(valor) {
  return moeda.format(valor);
}

export function valorCota(total, qtd) {
  return Math.round((total / qtd) * 100) / 100;
}

export function parseMoeda(texto) {
  const limpo = String(texto ?? '').replace(/R\$|\s/g, '').replace(/\./g, '').replace(',', '.');
  if (!/^\d+(\.\d{1,2})?$/.test(limpo)) return NaN;
  return Number(limpo);
}

const ENTIDADES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

export function escapeHtml(texto) {
  return String(texto ?? '').replace(/[&<>"']/g, (c) => ENTIDADES[c]);
}
```

`js/contagem.js`:
```js
const DURACAO_HOJE_MS = 13.5 * 3600 * 1000; // do horário da cerimônia até 23:59 do dia

export function calcularContagem(alvoMs, agoraMs) {
  const diff = alvoMs - agoraMs;
  if (diff <= 0) return { fase: -diff < DURACAO_HOJE_MS ? 'hoje' : 'depois' };
  const s = Math.floor(diff / 1000);
  return {
    fase: 'antes',
    dias: Math.floor(s / 86400),
    horas: Math.floor((s % 86400) / 3600),
    minutos: Math.floor((s % 3600) / 60),
    segundos: s % 60,
  };
}
```

- [ ] **Step 5: Rodar e confirmar sucesso**

Run: `npm test`
Expected: PASS (8 testes).

- [ ] **Step 6: Commit**

```bash
git add package.json .nojekyll .gitignore .claude/launch.json js/format.js js/contagem.js tests/format.test.js tests/contagem.test.js
git commit -m "feat: scaffold e utilitários de formatação e contagem

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Gerador de payload PIX (BR Code)

**Files:**
- Create: `js/pix.js`
- Test: `tests/pix.test.js`

**Interfaces:**
- Produces:
  - `crc16(texto: string): string` → 4 dígitos hex maiúsculos (CRC16-CCITT-FALSE, poly 0x1021, init 0xFFFF)
  - `normalizar(texto: string, max: number): string` → sem acentos, só `[A-Za-z0-9 .-]`, espaços colapsados, truncado
  - `gerarPayloadPix({ chave: string, nome: string, cidade: string, valor?: number, txid?: string }): string`

Referência: Manual de Padrões para Iniciação do Pix (Bacen). Vetores já verificados: `crc16('123456789') === '29B1'`; exemplo oficial abaixo termina em `1D3D`.

- [ ] **Step 1: Escrever testes que falham**

`tests/pix.test.js`:
```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { crc16, normalizar, gerarPayloadPix } from '../js/pix.js';

const EXEMPLO_BACEN =
  '00020126580014br.gov.bcb.pix0136123e4567-e12b-12d1-a456-4266554400005204000053039865802BR5913Fulano de Tal6008BRASILIA62070503***63041D3D';

test('crc16 bate com vetor padrão CCITT-FALSE', () => {
  assert.equal(crc16('123456789'), '29B1');
});

test('payload sem valor reproduz o exemplo do manual do Bacen', () => {
  const payload = gerarPayloadPix({
    chave: '123e4567-e12b-12d1-a456-426655440000',
    nome: 'Fulano de Tal',
    cidade: 'BRASILIA',
  });
  assert.equal(payload, EXEMPLO_BACEN);
});

test('payload com valor inclui campo 54 e CRC válido', () => {
  const payload = gerarPayloadPix({
    chave: '123e4567-e12b-12d1-a456-426655440000',
    nome: 'Fulano de Tal',
    cidade: 'BRASILIA',
    valor: 150,
  });
  assert.ok(payload.includes('5406150.00'));
  const semCrc = payload.slice(0, -4);
  assert.ok(semCrc.endsWith('6304'));
  assert.equal(payload.slice(-4), crc16(semCrc));
});

test('normalizar remove acentos, símbolos e trunca', () => {
  assert.equal(normalizar('Brasília', 15), 'Brasilia');
  assert.equal(normalizar('José  Conceição & Cia', 25), 'Jose Conceicao Cia');
  assert.equal(normalizar('Um nome muito comprido demais aqui', 25).length, 25);
});

test('nome com acento gera campo 59 com tamanho correto', () => {
  const payload = gerarPayloadPix({ chave: 'abc', nome: 'João', cidade: 'Curitiba', valor: 1 });
  assert.ok(payload.includes('5904Joao'));
  assert.ok(payload.includes('6008Curitiba'));
});
```

- [ ] **Step 2: Rodar e confirmar falha**

Run: `npm test`
Expected: FAIL — `Cannot find module '.../js/pix.js'`.

- [ ] **Step 3: Implementar**

`js/pix.js`:
```js
// BR Code estático do Pix — Manual de Padrões para Iniciação do Pix (Banco Central do Brasil)
const GUI_PIX = 'br.gov.bcb.pix';

function campo(id, valor) {
  return id + String(valor.length).padStart(2, '0') + valor;
}

export function crc16(texto) {
  let crc = 0xffff;
  for (const byte of new TextEncoder().encode(texto)) {
    crc ^= byte << 8;
    for (let i = 0; i < 8; i++) {
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

export function normalizar(texto, max) {
  return String(texto)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Za-z0-9 .-]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max)
    .trim();
}

export function gerarPayloadPix({ chave, nome, cidade, valor, txid = '***' }) {
  const conta = campo('00', GUI_PIX) + campo('01', chave);
  let payload = campo('00', '01') + campo('26', conta) + campo('52', '0000') + campo('53', '986');
  if (valor != null) payload += campo('54', Number(valor).toFixed(2));
  payload +=
    campo('58', 'BR') +
    campo('59', normalizar(nome, 25)) +
    campo('60', normalizar(cidade, 15)) +
    campo('62', campo('05', txid)) +
    '6304';
  return payload + crc16(payload);
}
```

Nota sobre o teste de truncamento: `'Um nome muito comprido demais aqui'.slice(0,25)` = `'Um nome muito comprido de'` (25 chars, não termina em espaço), portanto o `.trim()` final não altera o tamanho.

- [ ] **Step 4: Rodar e confirmar sucesso**

Run: `npm test`
Expected: PASS (todos, incluindo os 5 novos).

- [ ] **Step 5: Commit**

```bash
git add js/pix.js tests/pix.test.js
git commit -m "feat: gerador de payload PIX (BR Code) com CRC16

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Backend Apps Script (regras puras + integração com planilha)

**Files:**
- Create: `apps-script/Code.gs`
- Test: `tests/backend.test.js`

**Interfaces:**
- Produces (funções globais em `Code.gs`, testáveis via `node:vm`):
  - `linhasParaObjetos(linhas: any[][]): object[]` — 1ª linha = cabeçalho; ignora linhas com 1ª coluna vazia
  - `montarPresentes(presentes: object[], contribuicoes: object[]): Presente[]` — apenas ativos, ordenados por `ordem`
  - `Presente = { id, nome, descricao, icone, imagem, valor_total, qtd_cotas, valor_cota, cotas_vendidas, livre, esgotado, ordem }`
  - `limparTexto(texto): string` — remove caracteres de controle (exceto `\n`) e faz trim
  - `protegerFormula(texto: string): string` — prefixa `'` se começar com `= + - @`
  - `validarContribuicao(dados, presentes: Presente[])` → `{ ok: false, erro }` | `{ ok: true, registro: { presente_id, presente_nome, cotas, valor, nome, recado, observacao } }`
  - Erros: `nao_encontrado`, `cotas_invalidas`, `valor_invalido`, `nome_invalido`, `recado_invalido`
  - HTTP: `doGet(e)` (`?action=presentes`), `doPost(e)` (corpo JSON com `action: "contribuir"`), `configurarPlanilha()`

- [ ] **Step 1: Escrever testes que falham**

`tests/backend.test.js`:
```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const ctx = vm.createContext({});
vm.runInContext(readFileSync(new URL('../apps-script/Code.gs', import.meta.url), 'utf8'), ctx);
const plain = (x) => JSON.parse(JSON.stringify(x)); // objetos de outro realm

const PRESENTES = [
  { id: 'sofa', nome: 'Sofá', descricao: 'd', icone: 'sofa', imagem: '', valor_total: 3000, qtd_cotas: 30, ativo: true, ordem: 2 },
  { id: 'cafe', nome: 'Café', descricao: 'd', icone: 'cafe', imagem: '', valor_total: 100, qtd_cotas: 2, ativo: true, ordem: 1 },
  { id: 'oculto', nome: 'Oculto', descricao: '', icone: '', imagem: '', valor_total: 50, qtd_cotas: 1, ativo: false, ordem: 3 },
  { id: 'livre', nome: 'Livre', descricao: '', icone: 'livre', imagem: '', valor_total: 0, qtd_cotas: 0, ativo: true, ordem: 4 },
];
const CONTRIB = [
  { presente_id: 'cafe', cotas: 2 },
  { presente_id: 'sofa', cotas: 3 },
  { presente_id: 'sofa', cotas: 2 },
];

test('linhasParaObjetos usa cabeçalho e ignora linhas vazias', () => {
  const r = plain(ctx.linhasParaObjetos([['id', 'nome'], ['a', 'A'], ['', ''], ['b', 'B']]));
  assert.deepEqual(r, [{ id: 'a', nome: 'A' }, { id: 'b', nome: 'B' }]);
});

test('montarPresentes filtra inativos, ordena e soma cotas', () => {
  const r = plain(ctx.montarPresentes(PRESENTES, CONTRIB));
  assert.deepEqual(r.map((p) => p.id), ['cafe', 'sofa', 'livre']);
  const [cafe, sofa, livre] = r;
  assert.equal(cafe.cotas_vendidas, 2);
  assert.equal(cafe.esgotado, true);
  assert.equal(cafe.valor_cota, 50);
  assert.equal(sofa.cotas_vendidas, 5);
  assert.equal(sofa.esgotado, false);
  assert.equal(livre.livre, true);
  assert.equal(livre.esgotado, false);
});

test('montarPresentes limita vendidas a qtd_cotas', () => {
  const r = plain(ctx.montarPresentes(PRESENTES, [...CONTRIB, { presente_id: 'cafe', cotas: 1 }]));
  assert.equal(r[0].cotas_vendidas, 2);
});

test('montarPresentes aceita "TRUE" textual em ativo', () => {
  const r = plain(ctx.montarPresentes([{ ...PRESENTES[0], ativo: 'TRUE' }], []));
  assert.equal(r.length, 1);
});

const lista = () => ctx.montarPresentes(PRESENTES, CONTRIB);

test('contribuição válida em cotas calcula valor', () => {
  const r = plain(ctx.validarContribuicao({ id: 'sofa', cotas: 3, nome: ' Ana ', recado: 'Felicidades!' }, lista()));
  assert.deepEqual(r, {
    ok: true,
    registro: { presente_id: 'sofa', presente_nome: 'Sofá', cotas: 3, valor: 300, nome: 'Ana', recado: 'Felicidades!', observacao: '' },
  });
});

test('cotas acima das restantes gravam como excedente', () => {
  const r = plain(ctx.validarContribuicao({ id: 'cafe', cotas: 1, nome: 'Bia', recado: '' }, lista()));
  assert.equal(r.ok, true);
  assert.equal(r.registro.observacao, 'excedente');
});

test('valor livre usa o valor informado', () => {
  const r = plain(ctx.validarContribuicao({ id: 'livre', valor: 77.456, nome: 'Caio' }, lista()));
  assert.equal(r.registro.valor, 77.46);
  assert.equal(r.registro.cotas, 0);
});

test('erros de validação', () => {
  const v = (d) => plain(ctx.validarContribuicao(d, lista())).erro;
  assert.equal(v({ id: 'nada', cotas: 1, nome: 'X' }), 'nao_encontrado');
  assert.equal(v({ id: 'oculto', cotas: 1, nome: 'X' }), 'nao_encontrado');
  assert.equal(v({ id: 'sofa', cotas: 0, nome: 'X' }), 'cotas_invalidas');
  assert.equal(v({ id: 'sofa', cotas: 1.5, nome: 'X' }), 'cotas_invalidas');
  assert.equal(v({ id: 'sofa', cotas: 31, nome: 'X' }), 'cotas_invalidas');
  assert.equal(v({ id: 'livre', valor: 0.5, nome: 'X' }), 'valor_invalido');
  assert.equal(v({ id: 'livre', valor: 'abc', nome: 'X' }), 'valor_invalido');
  assert.equal(v({ id: 'livre', valor: 100001, nome: 'X' }), 'valor_invalido');
  assert.equal(v({ id: 'sofa', cotas: 1, nome: '   ' }), 'nome_invalido');
  assert.equal(v({ id: 'sofa', cotas: 1, nome: 'x'.repeat(81) }), 'nome_invalido');
  assert.equal(v({ id: 'sofa', cotas: 1, nome: 'X', recado: 'y'.repeat(1001) }), 'recado_invalido');
});

test('protege contra injeção de fórmula e remove controles', () => {
  const r = plain(ctx.validarContribuicao({ id: 'sofa', cotas: 1, nome: '=HYPERLINK("x")', recado: 'oi\u0007\nbeijos' }, lista()));
  assert.equal(r.registro.nome, '\'=HYPERLINK("x")');
  assert.equal(r.registro.recado, 'oi\nbeijos');
  assert.equal(ctx.protegerFormula('+55'), "'+55");
  assert.equal(ctx.protegerFormula('normal'), 'normal');
});
```

- [ ] **Step 2: Rodar e confirmar falha**

Run: `npm test`
Expected: FAIL — `ENOENT ... apps-script/Code.gs`.

- [ ] **Step 3: Implementar**

`apps-script/Code.gs`:
```js
/**
 * Backend da lista de presentes — Gustavo & Caroline.
 * Cole este arquivo em Extensões > Apps Script da planilha, execute configurarPlanilha()
 * uma vez e publique como App da Web (Executar como: eu | Acesso: qualquer pessoa).
 */

var ABA_PRESENTES = 'Presentes';
var ABA_CONTRIBUICOES = 'Contribuicoes';
var CABECALHO_PRESENTES = ['id', 'nome', 'descricao', 'icone', 'imagem', 'valor_total', 'qtd_cotas', 'ativo', 'ordem'];
var CABECALHO_CONTRIBUICOES = ['data_hora', 'presente_id', 'presente_nome', 'cotas', 'valor', 'nome', 'recado', 'observacao'];

var PRESENTES_INICIAIS = [
  ['passagens', 'Passagens da lua de mel', 'Para a gente chegar ao paraíso (de preferência na janela).', 'passagens', '', 3000, 30, true, 1],
  ['hotel', 'Diárias num hotel pé na areia', 'Acordar com barulho de mar e sem despertador.', 'hotel', '', 2400, 24, true, 2],
  ['jantar', 'Jantar romântico à luz de velas', 'Uma noite especial, sem louça para lavar.', 'jantar', '', 600, 6, true, 3],
  ['barco', 'Passeio de barco ao pôr do sol', 'O pôr do sol mais bonito da viagem, visto do mar.', 'barco', '', 500, 10, true, 4],
  ['geladeira', 'Geladeira nova (que não faz barulho)', 'Silenciosa, espaçosa e sempre cheia de coisa boa.', 'geladeira', '', 4000, 40, true, 5],
  ['sofa', 'Sofá para maratonar séries', 'Confortável o bastante para "só mais um episódio".', 'sofa', '', 3000, 30, true, 6],
  ['airfryer', 'Air fryer para o noivo aprender a cozinhar', 'Um voto de confiança nos dotes culinários do noivo.', 'airfryer', '', 500, 10, true, 7],
  ['cafe', 'Máquina de café para sobreviver às segundas', 'Combustível oficial das segundas-feiras.', 'cafe', '', 800, 16, true, 8],
  ['churrasco', 'Kit churrasco para os domingos em família', 'Para reunir família e amigos aos domingos.', 'churrasco', '', 400, 8, true, 9],
  ['mercado', 'Primeira compra do mercado a dois', 'O primeiro carrinho cheio da nossa casa.', 'mercado', '', 300, 6, true, 10],
  ['plantinha', 'Plantinha para testar se estamos prontos para um pet', 'Se ela sobreviver, pensamos no cachorro.', 'plantinha', '', 100, 2, true, 11],
  ['pizza', 'Pizza de reconciliação da primeira briga', 'Porque toda discussão termina melhor com pizza.', 'pizza', '', 150, 3, true, 12],
  ['sogra', 'Seguro contra a sogra', 'Cobertura completa para visitas surpresa. (Brincadeira, sogrinha!)', 'sogra', '', 250, 5, true, 13],
  ['livre', 'Contribua com o que o coração mandar', 'Escolha o valor que desejar. Todo carinho é bem-vindo.', 'livre', '', 0, 0, true, 14]
];

/* ---------- Regras puras (testadas em tests/backend.test.js) ---------- */

function linhasParaObjetos(linhas) {
  var cabecalho = linhas[0] || [];
  return linhas.slice(1)
    .filter(function (linha) { return linha[0] !== '' && linha[0] != null; })
    .map(function (linha) {
      var obj = {};
      cabecalho.forEach(function (chave, i) { obj[chave] = linha[i]; });
      return obj;
    });
}

function estaAtivo(valor) {
  return valor === true || String(valor).toUpperCase() === 'TRUE' || String(valor).toUpperCase() === 'SIM';
}

function arredondar(valor) {
  return Math.round(valor * 100) / 100;
}

function montarPresentes(presentes, contribuicoes) {
  var vendidas = {};
  contribuicoes.forEach(function (c) {
    var id = String(c.presente_id);
    vendidas[id] = (vendidas[id] || 0) + (Number(c.cotas) || 0);
  });
  return presentes
    .filter(function (p) { return estaAtivo(p.ativo); })
    .map(function (p) {
      var id = String(p.id);
      var qtd = Number(p.qtd_cotas) || 0;
      var total = Number(p.valor_total) || 0;
      var livre = qtd === 0;
      var vendidasId = livre ? 0 : Math.min(vendidas[id] || 0, qtd);
      return {
        id: id,
        nome: String(p.nome || ''),
        descricao: String(p.descricao || ''),
        icone: String(p.icone || ''),
        imagem: String(p.imagem || ''),
        valor_total: total,
        qtd_cotas: qtd,
        valor_cota: livre ? 0 : arredondar(total / qtd),
        cotas_vendidas: vendidasId,
        livre: livre,
        esgotado: !livre && vendidasId >= qtd,
        ordem: Number(p.ordem) || 0
      };
    })
    .sort(function (a, b) { return a.ordem - b.ordem; });
}

function limparTexto(texto) {
  return String(texto == null ? '' : texto).replace(/[\u0000-\u0009\u000B-\u001F\u007F]/g, '').trim();
}

function protegerFormula(texto) {
  return /^[=+\-@]/.test(texto) ? "'" + texto : texto;
}

function validarContribuicao(dados, presentes) {
  var presente = presentes.filter(function (p) { return p.id === String(dados.id); })[0];
  if (!presente) return { ok: false, erro: 'nao_encontrado' };

  var nome = limparTexto(dados.nome);
  if (nome.length < 1 || nome.length > 80) return { ok: false, erro: 'nome_invalido' };
  var recado = limparTexto(dados.recado);
  if (recado.length > 1000) return { ok: false, erro: 'recado_invalido' };

  var cotas = 0;
  var valor;
  var observacao = '';
  if (presente.livre) {
    valor = Number(dados.valor);
    if (!isFinite(valor) || valor < 1 || valor > 100000) return { ok: false, erro: 'valor_invalido' };
    valor = arredondar(valor);
  } else {
    cotas = Number(dados.cotas);
    if (!Number.isInteger(cotas) || cotas < 1 || cotas > presente.qtd_cotas) return { ok: false, erro: 'cotas_invalidas' };
    valor = arredondar(cotas * presente.valor_cota);
    if (cotas > presente.qtd_cotas - presente.cotas_vendidas) observacao = 'excedente';
  }

  return {
    ok: true,
    registro: {
      presente_id: presente.id,
      presente_nome: protegerFormula(presente.nome),
      cotas: cotas,
      valor: valor,
      nome: protegerFormula(nome),
      recado: protegerFormula(recado),
      observacao: observacao
    }
  };
}

/* ---------- Integração com Google Sheets ---------- */

function aba(nome) {
  return SpreadsheetApp.getActiveSpreadsheet().getSheetByName(nome);
}

function lerPresentes() {
  return montarPresentes(
    linhasParaObjetos(aba(ABA_PRESENTES).getDataRange().getValues()),
    linhasParaObjetos(aba(ABA_CONTRIBUICOES).getDataRange().getValues())
  );
}

function responderJson(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function doGet(e) {
  if (!e || !e.parameter || e.parameter.action !== 'presentes') return responderJson({ ok: false, erro: 'acao_invalida' });
  try {
    return responderJson({ ok: true, presentes: lerPresentes() });
  } catch (err) {
    console.error(err);
    return responderJson({ ok: false, erro: 'erro_interno' });
  }
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    var dados = JSON.parse(e.postData.contents);
    if (dados.action !== 'contribuir') return responderJson({ ok: false, erro: 'acao_invalida' });
    lock.waitLock(10000);
    var resultado = validarContribuicao(dados, lerPresentes());
    if (!resultado.ok) return responderJson(resultado);
    var r = resultado.registro;
    aba(ABA_CONTRIBUICOES).appendRow([new Date(), r.presente_id, r.presente_nome, r.cotas, r.valor, r.nome, r.recado, r.observacao]);
    return responderJson({ ok: true, excedente: r.observacao === 'excedente' });
  } catch (err) {
    console.error(err);
    return responderJson({ ok: false, erro: 'erro_interno' });
  } finally {
    lock.releaseLock();
  }
}

/** Execute uma vez pelo editor do Apps Script para criar as abas e a lista inicial. */
function configurarPlanilha() {
  var planilha = SpreadsheetApp.getActiveSpreadsheet();

  var presentes = planilha.getSheetByName(ABA_PRESENTES) || planilha.insertSheet(ABA_PRESENTES);
  if (presentes.getLastRow() === 0) {
    presentes.getRange(1, 1, 1, CABECALHO_PRESENTES.length).setValues([CABECALHO_PRESENTES]).setFontWeight('bold');
    presentes.getRange(2, 1, PRESENTES_INICIAIS.length, CABECALHO_PRESENTES.length).setValues(PRESENTES_INICIAIS);
    presentes.getRange(2, 8, PRESENTES_INICIAIS.length, 1).insertCheckboxes();
    presentes.getRange(2, 6, PRESENTES_INICIAIS.length, 1).setNumberFormat('R$ #,##0.00');
    presentes.setFrozenRows(1);
    presentes.autoResizeColumns(1, CABECALHO_PRESENTES.length);
  }

  var contrib = planilha.getSheetByName(ABA_CONTRIBUICOES) || planilha.insertSheet(ABA_CONTRIBUICOES);
  if (contrib.getLastRow() === 0) {
    contrib.getRange(1, 1, 1, CABECALHO_CONTRIBUICOES.length).setValues([CABECALHO_CONTRIBUICOES]).setFontWeight('bold');
    contrib.getRange('A:A').setNumberFormat('dd/mm/yyyy hh:mm');
    contrib.getRange('E:E').setNumberFormat('R$ #,##0.00');
    contrib.setFrozenRows(1);
  }
}
```

- [ ] **Step 4: Rodar e confirmar sucesso**

Run: `npm test`
Expected: PASS (todos os testes do backend + anteriores).

- [ ] **Step 5: Commit**

```bash
git add apps-script/Code.gs tests/backend.test.js
git commit -m "feat: backend Apps Script com validação e cálculo de cotas

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Identidade visual — CSS, ornamentos e ícones

**Files:**
- Create: `css/style.css`, `assets/ramo.svg`, `assets/papel.svg`, `assets/favicon.svg`, `js/icons.js`

**Interfaces:**
- Produces:
  - `ICONES: Record<string, string>` — corpo SVG (viewBox 0 0 48 48). Chaves de presentes: `passagens hotel jantar barco geladeira sofa airfryer cafe churrasco mercado plantinha pizza sogra livre presente`; ornamentos: `coracoes calendario igreja tacas aliancas`
  - `iconeSvg(chave: string): string` — SVG completo; chave desconhecida → `presente`
  - `preencherIcones(raiz: ParentNode): void` — injeta SVG em todo elemento `[data-icone]`
  - Classes CSS usadas pelas próximas tasks: `.container .rotulo .nav .nav__marca .nav__links .hero .hero__* .ramo .ramo--tl .ramo--br .contagem .contagem__fim .secao .secao--alt .secao__titulo .divisor .versiculo .casal .casal__foto .casal__texto .placeholder .eventos .cartao .botoes .botao .botao--cheio .presentes__intro .grid-presentes .presente .presente--esgotado .presente--livre .presente__icone .presente__valor .presente__cotas .progresso .selo .estado .banner-demo .rodape .pagina-presente .voltar .painel .seletor .total .campo .qr .copia-cola .recebedor .instrucao .erro .dica`

- [ ] **Step 1: Criar `js/icons.js`**

```js
const ICONES = {
  passagens: '<path d="M4 26l40-16-10 30-9-10-7 6 1-9 19-15-24 13z"/>',
  hotel: '<circle cx="24" cy="18" r="7"/><path d="M24 5v3M11 18H8M40 18h-3M14.5 8.5l2 2M33.5 8.5l-2 2"/><path d="M4 32c5-4 9-4 14 0s9 4 14 0 9-4 12-1M4 40c5-4 9-4 14 0s9 4 14 0 9-4 12-1"/>',
  jantar: '<rect x="13" y="22" width="6" height="18" rx="1"/><rect x="29" y="22" width="6" height="18" rx="1"/><path d="M16 12c-2 3-2 6 0 7 2-1 2-4 0-7zM32 12c-2 3-2 6 0 7 2-1 2-4 0-7zM8 42h32"/>',
  barco: '<path d="M24 6v28M24 8l14 22H24M22 12L10 30h12"/><path d="M6 34h36l-5 7H11z"/><path d="M4 45c4-2 8-2 12 0s8 2 12 0 8-2 12 0"/>',
  geladeira: '<rect x="13" y="4" width="22" height="40" rx="3"/><path d="M13 18h22M18 9v5M18 23v8"/>',
  sofa: '<path d="M8 22v-6a4 4 0 014-4h24a4 4 0 014 4v6"/><path d="M4 26a4 4 0 018 0v4h24v-4a4 4 0 018 0v10H4z"/><path d="M8 36v4M40 36v4"/>',
  airfryer: '<path d="M12 10a6 6 0 016-6h12a6 6 0 016 6v28a4 4 0 01-4 4H16a4 4 0 01-4-4z"/><circle cx="24" cy="14" r="3"/><rect x="16" y="24" width="16" height="12" rx="2"/><path d="M22 30h4"/>',
  cafe: '<path d="M8 18h26v10a10 10 0 01-10 10h-6A10 10 0 018 28z"/><path d="M34 21h3a4 4 0 010 8h-3"/><path d="M16 6c-2 3 2 5 0 8M22 6c-2 3 2 5 0 8M28 6c-2 3 2 5 0 8M6 42h30"/>',
  churrasco: '<path d="M8 20h32a16 16 0 01-32 0z"/><path d="M16 34l-4 10M32 34l4 10M24 36v8"/><path d="M18 6c-2 3 2 5 0 8M24 6c-2 3 2 5 0 8M30 6c-2 3 2 5 0 8"/>',
  mercado: '<path d="M4 8h6l5 22h22l4-15H12"/><circle cx="18" cy="38" r="3"/><circle cx="34" cy="38" r="3"/>',
  plantinha: '<path d="M14 30h20l-3 14H17z"/><path d="M24 30V16"/><path d="M24 20c0-6-5-10-11-10 0 6 5 10 11 10zM24 16c0-6 5-10 11-10 0 6-5 10-11 10z"/>',
  pizza: '<path d="M24 6L6 40c11 5 25 5 36 0z"/><path d="M9 34c9 4 21 4 30 0"/><circle cx="22" cy="22" r="2"/><circle cx="28" cy="30" r="2"/><circle cx="18" cy="31" r="2"/>',
  sogra: '<path d="M24 4l16 6v12c0 10-7 18-16 22C15 40 8 32 8 22V10z"/><path d="M24 31s-8-5-8-10a4 4 0 018-1 4 4 0 018 1c0 5-8 10-8 10z"/>',
  livre: '<path d="M24 40S6 29 6 17a9 9 0 0118-3 9 9 0 0118 3c0 12-18 23-18 23z"/>',
  presente: '<rect x="6" y="18" width="36" height="10" rx="1"/><path d="M9 28v14h30V28M24 18v24"/><path d="M24 18c-4 0-10-2-10-7 0-3 3-5 6-3 3 2 4 10 4 10zM24 18c4 0 10-2 10-7 0-3-3-5-6-3-3 2-4 10-4 10z"/>',
  coracoes: '<path d="M18 36S6 28 6 19a6 6 0 0112-2 6 6 0 0112 2c0 9-12 17-12 17z"/><path d="M30 36s-12-8-12-17a6 6 0 0112-2 6 6 0 0112 2c0 9-12 17-12 17z"/>',
  calendario: '<rect x="8" y="10" width="32" height="30" rx="3"/><path d="M8 18h32M16 6v8M32 6v8M15 25h2M23 25h2M31 25h2M15 32h2M23 32h2M31 32h2"/>',
  igreja: '<path d="M24 4v8M21 7h6M14 22l10-10 10 10M16 20v22h16V20M8 42h32M21 42v-7a3 3 0 016 0v7"/><circle cx="24" cy="26" r="2"/>',
  tacas: '<path d="M12 6h10l-1 11a4 4 0 01-8 0zM17 21v15M13 36h8M26 6h10l-1 11a4 4 0 01-8 0zM31 21v15M27 36h8"/>',
  aliancas: '<circle cx="19" cy="28" r="10"/><circle cx="29" cy="28" r="10"/><path d="M26 13l3-5 3 5-3 3z"/>',
};

export function iconeSvg(chave) {
  const corpo = ICONES[chave] || ICONES.presente;
  return `<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${corpo}</svg>`;
}

export function preencherIcones(raiz) {
  raiz.querySelectorAll('[data-icone]').forEach((el) => {
    el.innerHTML = iconeSvg(el.dataset.icone);
  });
}
```

- [ ] **Step 2: Criar SVGs de apoio**

`assets/ramo.svg` (ramo diagonal de baixo-esquerda para cima-direita; o CSS espelha para cada canto):
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
  <path d="M4 196C40 150 84 98 150 22" fill="none" stroke="#6d8294" stroke-width="1.2"/>
  <path d="M70 118c10-4 24-2 34 6M112 70c8-6 22-8 34-4" fill="none" stroke="#6d8294" stroke-width="1"/>
  <g fill="#5b7083" fill-opacity=".55">
    <path d="M0 0c10-8 26-8 34 0-8 8-24 8-34 0z" transform="translate(24 172) rotate(-140)"/>
    <path d="M0 0c10-8 26-8 34 0-8 8-24 8-34 0z" transform="translate(30 166) rotate(-15)"/>
    <path d="M0 0c10-8 26-8 34 0-8 8-24 8-34 0z" transform="translate(48 146) rotate(-130)"/>
    <path d="M0 0c10-8 26-8 34 0-8 8-24 8-34 0z" transform="translate(56 138) rotate(-25)"/>
    <path d="M0 0c10-8 26-8 34 0-8 8-24 8-34 0z" transform="translate(80 108) rotate(-120)"/>
    <path d="M0 0c10-8 26-8 34 0-8 8-24 8-34 0z" transform="translate(104 124) rotate(20)"/>
    <path d="M0 0c10-8 26-8 34 0-8 8-24 8-34 0z" transform="translate(100 84) rotate(-35)"/>
    <path d="M0 0c10-8 26-8 34 0-8 8-24 8-34 0z" transform="translate(118 62) rotate(-115)"/>
    <path d="M0 0c10-8 26-8 34 0-8 8-24 8-34 0z" transform="translate(146 66) rotate(-10)"/>
    <path d="M0 0c10-8 26-8 34 0-8 8-24 8-34 0z" transform="translate(136 40) rotate(-50)"/>
  </g>
  <g fill="#5b7083" fill-opacity=".3">
    <path d="M0 0c8-6 20-6 26 0-6 6-18 6-26 0z" transform="translate(64 128) rotate(-160)"/>
    <path d="M0 0c8-6 20-6 26 0-6 6-18 6-26 0z" transform="translate(92 96) rotate(-5)"/>
    <path d="M0 0c8-6 20-6 26 0-6 6-18 6-26 0z" transform="translate(128 52) rotate(-150)"/>
  </g>
  <g fill="#f7f2e6" stroke="#8d9ba8" stroke-width=".8">
    <circle cx="150" cy="22" r="3.2"/><circle cx="158" cy="30" r="2.6"/><circle cx="144" cy="14" r="2.4"/>
    <circle cx="40" cy="160" r="2.6"/><circle cx="90" cy="98" r="2.4"/>
  </g>
</svg>
```

`assets/papel.svg`:
```svg
<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300">
  <filter id="n"><feTurbulence type="fractalNoise" baseFrequency=".8" numOctaves="3" stitchTiles="stitch"/>
  <feColorMatrix values="0 0 0 0 .35  0 0 0 0 .30  0 0 0 0 .22  0 0 0 .05 0"/></filter>
  <rect width="100%" height="100%" filter="url(#n)"/>
</svg>
```

`assets/favicon.svg`:
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <circle cx="32" cy="32" r="30" fill="#f5f1e8" stroke="#1f2d4d" stroke-width="2"/>
  <text x="32" y="41" text-anchor="middle" font-family="Georgia, serif" font-style="italic" font-size="24" fill="#1f2d4d">G&amp;C</text>
</svg>
```

- [ ] **Step 3: Criar `css/style.css`**

```css
:root {
  --creme: #f5f1e8;
  --creme-2: #efe9dc;
  --branco: #fffdf8;
  --marinho: #1f2d4d;
  --marinho-2: #34466b;
  --cinza-azul: #5b7083;
  --linha: #1f2d4d33;
  --erro: #8a2b2b;
  --fonte-script: 'Pinyon Script', cursive;
  --fonte-serif: 'Cormorant Garamond', Georgia, serif;
  --sombra: 0 1px 2px #1f2d4d14, 0 8px 24px #1f2d4d0f;
}

* { box-sizing: border-box; }
html { scroll-behavior: smooth; scroll-padding-top: 64px; }
body {
  margin: 0;
  background: var(--creme) url(../assets/papel.svg);
  color: var(--marinho);
  font-family: var(--fonte-serif);
  font-size: 1.125rem;
  line-height: 1.6;
  -webkit-font-smoothing: antialiased;
}
img { max-width: 100%; display: block; }
a { color: inherit; }
:focus-visible { outline: 2px solid var(--cinza-azul); outline-offset: 3px; }
[hidden] { display: none !important; }

.container { max-width: 1080px; margin: 0 auto; padding: 0 16px; }
.rotulo { font-size: .8rem; letter-spacing: .3em; text-transform: uppercase; font-weight: 600; margin: 0; }

/* Navegação */
.nav { position: sticky; top: 0; z-index: 10; background: #f5f1e8e6; backdrop-filter: blur(6px); border-bottom: 1px solid var(--linha); }
.nav .container { display: flex; align-items: center; justify-content: space-between; height: 56px; }
.nav__marca { font-family: var(--fonte-script); font-size: 1.8rem; text-decoration: none; line-height: 1; }
.nav__links { display: flex; gap: 1.25rem; list-style: none; margin: 0; padding: 0; }
.nav__links a { text-decoration: none; font-size: .75rem; letter-spacing: .2em; text-transform: uppercase; font-weight: 600; }
.nav__links a:hover { color: var(--cinza-azul); }
@media (max-width: 640px) {
  .nav__links { gap: .75rem; }
  .nav__links li:first-child { display: none; }
  .nav__links a { font-size: .65rem; letter-spacing: .12em; }
}

/* Hero */
.hero { position: relative; min-height: calc(100svh - 56px); display: grid; place-items: center; text-align: center; padding: 72px 16px; overflow: hidden; }
.ramo { position: absolute; width: clamp(130px, 26vw, 280px); pointer-events: none; }
.ramo--tl { top: 0; left: 0; transform: scaleY(-1); }
.ramo--br { bottom: 0; right: 0; transform: scaleX(-1); }
.hero__conteudo { position: relative; }
.hero__abertura { font-size: 1.05rem; max-width: 34ch; margin: 0 auto 1.5rem; }
.hero__nomes { font-family: var(--fonte-script); font-weight: 400; font-size: clamp(3.2rem, 12vw, 6.5rem); line-height: 1.1; margin: 0; }
.hero__nomes > span { display: block; }
.hero__nomes > .hero__e { display: flex; align-items: center; justify-content: center; gap: 1rem; font-family: var(--fonte-script); font-size: 2.2rem; line-height: 1; margin: .25rem 0; }
.hero__e::before, .hero__e::after { content: ""; width: 64px; height: 1px; background: var(--marinho); }
.hero__data { margin-top: 1.75rem; }
.hero__data strong { display: block; font-size: clamp(1.8rem, 5vw, 2.6rem); font-weight: 500; line-height: 1.2; }
.contagem { display: flex; gap: 10px; justify-content: center; margin-top: 2rem; }
.contagem div { min-width: 70px; padding: 12px 6px; border: 1px solid var(--linha); background: #fffdf899; }
.contagem span { display: block; font-size: 2rem; line-height: 1; font-weight: 500; }
.contagem small { font-size: .62rem; letter-spacing: .2em; text-transform: uppercase; }
.contagem__fim { font-size: 1.4rem; font-style: italic; margin: 0; }

/* Seções */
.secao { padding: 80px 0; text-align: center; }
.secao--alt { background: #efe9dc99; }
.secao__titulo { font-family: var(--fonte-script); font-weight: 400; font-size: clamp(2.6rem, 7vw, 3.6rem); line-height: 1.2; margin: 0 0 .5rem; }
.divisor { display: flex; align-items: center; justify-content: center; gap: 16px; margin: 0 auto 2rem; }
.divisor::before, .divisor::after { content: ""; height: 1px; width: min(120px, 25vw); background: var(--marinho); opacity: .6; }
.divisor svg { width: 36px; height: 36px; }
.versiculo blockquote { margin: 0 auto; max-width: 36ch; font-style: italic; font-size: clamp(1.3rem, 3.5vw, 1.7rem); line-height: 1.4; }
.versiculo cite { display: block; margin-top: .75rem; font-style: normal; font-size: .9rem; letter-spacing: .1em; }

/* O Casal */
.casal { display: grid; gap: 32px; align-items: center; text-align: left; }
@media (min-width: 768px) { .casal { grid-template-columns: 1fr 1.2fr; } }
.casal__foto { aspect-ratio: 4 / 5; border: 1px solid var(--linha); padding: 8px; background: var(--branco); box-shadow: var(--sombra); }
.casal__foto img { width: 100%; height: 100%; object-fit: cover; }
.casal__texto p { margin: 0 0 1rem; }
.placeholder { display: grid; place-items: center; height: 100%; padding: 16px; text-align: center; font-size: .95rem; color: var(--cinza-azul); background: repeating-linear-gradient(45deg, var(--creme-2), var(--creme-2) 10px, var(--creme) 10px, var(--creme) 20px); }
p.placeholder { display: block; height: auto; border: 1px dashed var(--cinza-azul); background: none; font-style: italic; }

/* Evento */
.eventos { display: grid; gap: 24px; }
@media (min-width: 768px) { .eventos { grid-template-columns: 1fr 1fr; } }
.cartao { position: relative; background: var(--branco); border: 1px solid var(--linha); padding: 40px 24px; box-shadow: var(--sombra); }
.cartao::after { content: ""; position: absolute; inset: 6px; border: 1px solid var(--linha); pointer-events: none; }
.cartao > [data-icone] svg { width: 44px; height: 44px; margin: 0 auto 12px; display: block; }
.cartao h3 { font-size: 1.6rem; font-weight: 500; line-height: 1.2; margin: .4rem 0 .75rem; }
.cartao address { font-style: normal; margin-bottom: 1.25rem; }
.cartao__hora { margin: 0 0 .5rem; }

/* Botões */
.botoes { display: flex; gap: 8px; justify-content: center; flex-wrap: wrap; }
.botao { position: relative; z-index: 1; display: inline-flex; align-items: center; justify-content: center; gap: .5rem; min-height: 44px; padding: 10px 22px; border: 1px solid var(--marinho); background: transparent; color: var(--marinho); font: 600 .75rem/1 var(--fonte-serif); letter-spacing: .2em; text-transform: uppercase; text-decoration: none; cursor: pointer; transition: background .2s, color .2s; }
.botao:hover { background: var(--marinho); color: var(--creme); }
.botao--cheio { background: var(--marinho); color: var(--creme); }
.botao--cheio:hover { background: var(--marinho-2); }
.botao:disabled { opacity: .45; cursor: not-allowed; background: transparent; color: var(--marinho); }
.botao--largo { width: 100%; }

/* Lista de presentes */
.presentes__intro { max-width: 60ch; margin: 0 auto 2.5rem; }
.presentes__intro p { margin: 0 0 .75rem; }
.grid-presentes { display: grid; gap: 20px; grid-template-columns: 1fr; }
@media (min-width: 640px) { .grid-presentes { grid-template-columns: repeat(2, 1fr); } }
@media (min-width: 1000px) { .grid-presentes { grid-template-columns: repeat(3, 1fr); } }
.presente { position: relative; display: flex; flex-direction: column; align-items: center; background: var(--branco); border: 1px solid var(--linha); padding: 28px 20px 24px; box-shadow: var(--sombra); }
.presente__icone { width: 72px; height: 72px; margin-bottom: 12px; }
.presente__icone svg, .presente__icone img { width: 100%; height: 100%; object-fit: cover; border-radius: 50%; }
.presente h3 { font-size: 1.3rem; font-weight: 600; line-height: 1.25; margin: 0 0 .4rem; }
.presente p { font-size: 1rem; margin: 0 0 1rem; color: var(--marinho-2); flex: 1; }
.presente__valor { font-size: 1.05rem; margin-bottom: .5rem; }
.progresso { width: 100%; height: 4px; background: #1f2d4d1a; margin: 4px 0 6px; }
.progresso span { display: block; height: 100%; background: var(--cinza-azul); }
.presente__cotas { font-size: .85rem; margin-bottom: 1rem; color: var(--cinza-azul); }
.presente--esgotado { opacity: .6; }
.presente--livre { border-color: var(--marinho); }
.selo { position: absolute; top: 14px; right: -6px; background: var(--marinho); color: var(--creme); font-size: .65rem; letter-spacing: .2em; text-transform: uppercase; padding: 4px 10px; }
.estado { padding: 32px 0; color: var(--cinza-azul); }
.estado p { margin: 0 0 1rem; }

.banner-demo { background: var(--marinho); color: var(--creme); text-align: center; font-size: .85rem; padding: 8px 16px; }

.rodape { padding: 48px 16px; text-align: center; border-top: 1px solid var(--linha); }
.rodape .nav__marca { display: block; font-size: 2.4rem; margin-bottom: .5rem; }
.rodape p { margin: 0; font-size: .9rem; letter-spacing: .1em; }

/* Página de presentear */
.pagina-presente { max-width: 560px; margin: 0 auto; padding: 40px 16px 80px; text-align: center; }
.voltar { display: inline-block; margin-bottom: 24px; font-size: .8rem; letter-spacing: .2em; text-transform: uppercase; text-decoration: none; font-weight: 600; }
.painel { position: relative; background: var(--branco); border: 1px solid var(--linha); box-shadow: var(--sombra); padding: 32px 24px; }
.painel h1 { font-size: 1.7rem; font-weight: 600; line-height: 1.25; margin: 0 0 .5rem; }
.painel h2 { font-family: var(--fonte-script); font-weight: 400; font-size: 2.6rem; line-height: 1.2; margin: 0 0 .5rem; }
.painel .presente__icone { margin: 0 auto 12px; }
.seletor { display: flex; align-items: center; justify-content: center; gap: 16px; margin: 16px 0 4px; }
.seletor button { width: 44px; height: 44px; border: 1px solid var(--marinho); background: transparent; color: var(--marinho); font-size: 1.4rem; cursor: pointer; }
.seletor button:disabled { opacity: .35; cursor: not-allowed; }
.seletor output { font-size: 2rem; min-width: 3ch; }
.total { font-size: 1.5rem; margin: 8px 0 24px; }
.campo { display: block; text-align: left; margin-bottom: 16px; }
.campo span { display: block; font-size: .75rem; letter-spacing: .2em; text-transform: uppercase; font-weight: 600; margin-bottom: 6px; }
.campo input, .campo textarea { width: 100%; padding: 12px; border: 1px solid #1f2d4d55; border-radius: 0; background: #fff; font: inherit; color: inherit; }
.campo textarea { min-height: 120px; resize: vertical; }
.qr { width: min(260px, 100%); margin: 16px auto; padding: 12px; background: #fff; border: 1px solid var(--linha); }
.qr svg { display: block; width: 100%; height: auto; }
.copia-cola { word-break: break-all; font-size: .75rem; background: var(--creme-2); padding: 10px; text-align: left; font-family: ui-monospace, Consolas, monospace; margin: 12px 0; }
.recebedor, .instrucao { font-size: .95rem; margin: 0 0 12px; }
.instrucao { color: var(--marinho-2); }
.erro { color: var(--erro); font-size: .95rem; margin: 8px 0; }
.dica { font-size: .85rem; color: var(--cinza-azul); margin: 12px 0 0; }
.painel .botoes { margin-top: 12px; }
```

- [ ] **Step 4: Verificação rápida**

Run: `npm test`
Expected: PASS (nada quebrou). Validação visual acontece na Task 6.

- [ ] **Step 5: Commit**

```bash
git add css/style.css assets/ramo.svg assets/papel.svg assets/favicon.svg js/icons.js
git commit -m "feat: identidade visual, ornamentos e ícones

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Configuração, dados de demonstração e camada de API

**Files:**
- Create: `js/config.js`, `js/exemplo.js`, `js/api.js`, `js/ui.js`

**Interfaces:**
- Consumes: formato `Presente` da Task 3.
- Produces:
  - `CONFIG = { chavePix, nomeRecebedor, cidade, apiUrl, dataCasamento }`
  - `PRESENTES_EXEMPLO: Presente[]`
  - `modoDemo: boolean` (true quando `CONFIG.apiUrl` vazio)
  - `listarPresentes(): Promise<Presente[]>` — lança `Error` em falha
  - `obterPresente(id: string): Promise<Presente | null>`
  - `enviarContribuicao({ id, cotas, valor, nome, recado }): Promise<{ ok: boolean, erro?: string, excedente?: boolean }>` — lança em falha de rede
  - `mostrarBannerDemo(): void`

- [ ] **Step 1: Criar `js/config.js`**

```js
// Configuração do site. Estes valores ficam públicos no código — use a CHAVE ALEATÓRIA do Pix.
export const CONFIG = {
  chavePix: '',                  // chave aleatória do Nubank (ex.: 'a1b2c3d4-...')
  nomeRecebedor: 'Gustavo Gaioski', // até 25 caracteres
  cidade: 'Curitiba',            // até 15 caracteres
  apiUrl: '',                    // URL do App da Web do Apps Script (termina em /exec)
  dataCasamento: '2026-12-12T10:30:00-03:00',
};
```

- [ ] **Step 2: Criar `js/exemplo.js`**

```js
// Dados usados apenas no modo demonstração (quando CONFIG.apiUrl está vazio).
const BASE = [
  ['passagens', 'Passagens da lua de mel', 'Para a gente chegar ao paraíso (de preferência na janela).', 3000, 30, 12],
  ['hotel', 'Diárias num hotel pé na areia', 'Acordar com barulho de mar e sem despertador.', 2400, 24, 5],
  ['jantar', 'Jantar romântico à luz de velas', 'Uma noite especial, sem louça para lavar.', 600, 6, 2],
  ['barco', 'Passeio de barco ao pôr do sol', 'O pôr do sol mais bonito da viagem, visto do mar.', 500, 10, 0],
  ['geladeira', 'Geladeira nova (que não faz barulho)', 'Silenciosa, espaçosa e sempre cheia de coisa boa.', 4000, 40, 8],
  ['sofa', 'Sofá para maratonar séries', 'Confortável o bastante para "só mais um episódio".', 3000, 30, 3],
  ['airfryer', 'Air fryer para o noivo aprender a cozinhar', 'Um voto de confiança nos dotes culinários do noivo.', 500, 10, 10],
  ['cafe', 'Máquina de café para sobreviver às segundas', 'Combustível oficial das segundas-feiras.', 800, 16, 4],
  ['churrasco', 'Kit churrasco para os domingos em família', 'Para reunir família e amigos aos domingos.', 400, 8, 0],
  ['mercado', 'Primeira compra do mercado a dois', 'O primeiro carrinho cheio da nossa casa.', 300, 6, 1],
  ['plantinha', 'Plantinha para testar se estamos prontos para um pet', 'Se ela sobreviver, pensamos no cachorro.', 100, 2, 0],
  ['pizza', 'Pizza de reconciliação da primeira briga', 'Porque toda discussão termina melhor com pizza.', 150, 3, 0],
  ['sogra', 'Seguro contra a sogra', 'Cobertura completa para visitas surpresa. (Brincadeira, sogrinha!)', 250, 5, 0],
  ['livre', 'Contribua com o que o coração mandar', 'Escolha o valor que desejar. Todo carinho é bem-vindo.', 0, 0, 0],
];

export const PRESENTES_EXEMPLO = BASE.map(([id, nome, descricao, total, qtd, vendidas], i) => ({
  id,
  nome,
  descricao,
  icone: id,
  imagem: '',
  valor_total: total,
  qtd_cotas: qtd,
  valor_cota: qtd ? Math.round((total / qtd) * 100) / 100 : 0,
  cotas_vendidas: vendidas,
  livre: qtd === 0,
  esgotado: qtd > 0 && vendidas >= qtd,
  ordem: i + 1,
}));
```

(`airfryer` sai esgotado no demo para exercitar o selo.)

- [ ] **Step 3: Criar `js/api.js`**

```js
import { CONFIG } from './config.js';
import { PRESENTES_EXEMPLO } from './exemplo.js';

export const modoDemo = !CONFIG.apiUrl;

export async function listarPresentes() {
  if (modoDemo) return PRESENTES_EXEMPLO;
  const resposta = await fetch(`${CONFIG.apiUrl}?action=presentes`);
  const dados = await resposta.json();
  if (!dados.ok) throw new Error(dados.erro || 'erro_desconhecido');
  return dados.presentes;
}

export async function obterPresente(id) {
  const presentes = await listarPresentes();
  return presentes.find((p) => p.id === id) || null;
}

export async function enviarContribuicao({ id, cotas, valor, nome, recado }) {
  if (modoDemo) {
    await new Promise((r) => setTimeout(r, 600));
    return { ok: true, excedente: false };
  }
  // text/plain evita o preflight de CORS, que o Apps Script não responde
  const resposta = await fetch(CONFIG.apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ action: 'contribuir', id, cotas, valor, nome, recado }),
  });
  return resposta.json();
}
```

- [ ] **Step 4: Criar `js/ui.js`**

```js
export function mostrarBannerDemo() {
  const banner = document.createElement('div');
  banner.className = 'banner-demo';
  banner.textContent = 'Modo demonstração — configure apiUrl e chavePix em js/config.js.';
  document.body.prepend(banner);
  console.warn('[casamento] Modo demonstração: CONFIG.apiUrl vazio.');
}
```

- [ ] **Step 5: Verificar e commitar**

Run: `npm test` → PASS. Run: `node -e "import('./js/exemplo.js').then(m=>console.log(m.PRESENTES_EXEMPLO.length, m.PRESENTES_EXEMPLO.find(p=>p.esgotado).id))"` → `14 airfryer`.

```bash
git add js/config.js js/exemplo.js js/api.js js/ui.js
git commit -m "feat: configuração, dados de demonstração e camada de API

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Página principal (`index.html` + `js/home.js`)

**Files:**
- Create: `index.html`, `js/home.js`

**Interfaces:**
- Consumes: `CONFIG` (config.js), `listarPresentes`, `modoDemo` (api.js), `formatarMoeda`, `escapeHtml` (format.js), `calcularContagem` (contagem.js), `iconeSvg`, `preencherIcones` (icons.js), `mostrarBannerDemo` (ui.js)
- Produces: link para `presente.html?id=<id>`

- [ ] **Step 1: Criar `index.html`**

```html
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Gustavo & Caroline · 12.12.2026</title>
  <meta name="description" content="Casamento de Gustavo e Caroline — 12 de dezembro de 2026, Curitiba. Informações da cerimônia, recepção e lista de presentes.">
  <meta property="og:type" content="website">
  <meta property="og:title" content="Gustavo & Caroline · 12.12.2026">
  <meta property="og:description" content="Com a bênção de Deus, convidamos você para celebrar o nosso casamento.">
  <meta property="og:image" content="https://gustavo-inteknet.github.io/casamento/assets/og.png">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <link rel="icon" href="assets/favicon.svg" type="image/svg+xml">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400&family=Pinyon+Script&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="css/style.css">
</head>
<body>
  <nav class="nav" aria-label="Principal">
    <div class="container">
      <a class="nav__marca" href="#inicio">G &amp; C</a>
      <ul class="nav__links">
        <li><a href="#inicio">Início</a></li>
        <li><a href="#casal">O Casal</a></li>
        <li><a href="#evento">O Evento</a></li>
        <li><a href="#presentes">Presentes</a></li>
      </ul>
    </div>
  </nav>

  <header class="hero" id="inicio">
    <img class="ramo ramo--tl" src="assets/ramo.svg" alt="">
    <img class="ramo ramo--br" src="assets/ramo.svg" alt="">
    <div class="hero__conteudo">
      <p class="hero__abertura">Com a bênção de Deus e de seus pais, convidam para o sacramento de seu matrimônio</p>
      <h1 class="hero__nomes">
        <span>Gustavo</span>
        <span class="hero__e">e</span>
        <span>Caroline</span>
      </h1>
      <div class="hero__data">
        <p class="rotulo">A realizar-se dia</p>
        <strong>12 de Dezembro de 2026</strong>
        <p class="rotulo">às 10:30</p>
      </div>
      <div class="contagem" id="contagem" aria-label="Contagem regressiva">
        <div><span data-unidade="dias">--</span><small>Dias</small></div>
        <div><span data-unidade="horas">--</span><small>Horas</small></div>
        <div><span data-unidade="minutos">--</span><small>Min</small></div>
        <div><span data-unidade="segundos">--</span><small>Seg</small></div>
      </div>
    </div>
  </header>

  <section class="secao secao--alt versiculo" aria-label="Versículo">
    <div class="container">
      <div class="divisor" data-icone="coracoes"></div>
      <blockquote>“Sim, coisas grandiosas fez o Senhor por nós, por isso estamos alegres.”</blockquote>
      <cite>— Salmos 126:3 —</cite>
    </div>
  </section>

  <section class="secao" id="casal">
    <div class="container">
      <h2 class="secao__titulo">O Casal</h2>
      <div class="divisor" data-icone="aliancas"></div>
      <div class="casal">
        <div class="casal__foto">
          <!-- SUBSTITUIR: troque o div abaixo por <img src="assets/casal.jpg" alt="Gustavo e Caroline"> -->
          <div class="placeholder">Foto do casal<br>(assets/casal.jpg)</div>
        </div>
        <div class="casal__texto">
          <!-- SUBSTITUIR: escreva aqui a história de vocês, um parágrafo por <p> -->
          <p class="placeholder">[Espaço para a história do casal: como se conheceram, momentos marcantes e o que esperam desta nova fase.]</p>
        </div>
      </div>
    </div>
  </section>

  <section class="secao secao--alt" id="evento">
    <div class="container">
      <h2 class="secao__titulo">O Evento</h2>
      <div class="divisor" data-icone="calendario"></div>
      <div class="eventos">
        <article class="cartao">
          <div data-icone="igreja"></div>
          <p class="rotulo">Cerimônia</p>
          <h3>Santuário Divina Misericórdia</h3>
          <p class="cartao__hora">12 de dezembro de 2026 · 10:30</p>
          <address>Estr. do Ganchinho, nº 570 – Umbará<br>Curitiba – PR, 81930-165</address>
          <div class="botoes">
            <a class="botao" target="_blank" rel="noopener" href="https://www.google.com/maps/search/?api=1&query=Santu%C3%A1rio%20Divina%20Miseric%C3%B3rdia%2C%20Estr.%20do%20Ganchinho%2C%20570%20-%20Umbar%C3%A1%2C%20Curitiba%20-%20PR%2C%2081930-165">Google Maps</a>
            <a class="botao" target="_blank" rel="noopener" href="https://waze.com/ul?q=Santu%C3%A1rio%20Divina%20Miseric%C3%B3rdia%2C%20Estr.%20do%20Ganchinho%2C%20570%20-%20Umbar%C3%A1%2C%20Curitiba%20-%20PR%2C%2081930-165&navigate=yes">Waze</a>
          </div>
        </article>
        <article class="cartao">
          <div data-icone="tacas"></div>
          <p class="rotulo">Recepção</p>
          <h3>Salão Pátio 74</h3>
          <p class="cartao__hora">Logo após a cerimônia</p>
          <address>Rua Eponino Macuco, 74 – Capão Raso<br>Curitiba – PR, 81110-450</address>
          <div class="botoes">
            <a class="botao" target="_blank" rel="noopener" href="https://www.google.com/maps/search/?api=1&query=Sal%C3%A3o%20P%C3%A1tio%2074%2C%20Rua%20Eponino%20Macuco%2C%2074%20-%20Cap%C3%A3o%20Raso%2C%20Curitiba%20-%20PR%2C%2081110-450">Google Maps</a>
            <a class="botao" target="_blank" rel="noopener" href="https://waze.com/ul?q=Sal%C3%A3o%20P%C3%A1tio%2074%2C%20Rua%20Eponino%20Macuco%2C%2074%20-%20Cap%C3%A3o%20Raso%2C%20Curitiba%20-%20PR%2C%2081110-450&navigate=yes">Waze</a>
          </div>
        </article>
      </div>
    </div>
  </section>

  <section class="secao" id="presentes">
    <div class="container">
      <h2 class="secao__titulo">Lista de Presentes</h2>
      <div class="divisor" data-icone="coracoes"></div>
      <div class="presentes__intro">
        <p>Sua presença é o nosso maior presente! Mas, se desejar nos presentear, preparamos algumas sugestões com muito carinho.</p>
        <p>Os presentes são divididos em <strong>cotas</strong>: escolha quantas quiser e contribua via Pix. Assim, todos podem participar da forma que for mais confortável.</p>
      </div>
      <div id="lista-presentes" class="grid-presentes" aria-live="polite">
        <p class="estado">Carregando presentes…</p>
      </div>
    </div>
  </section>

  <footer class="rodape">
    <span class="nav__marca">Gustavo &amp; Caroline</span>
    <p>12.12.2026 · Feito com amor</p>
  </footer>

  <script type="module" src="js/home.js"></script>
</body>
</html>
```

Nota: o `<div class="estado">` dentro do grid ocupa uma célula; `home.js` substitui o conteúdo inteiro do grid. Para mensagens de estado, `home.js` usa `grid-column: 1 / -1` via atributo `style`.

- [ ] **Step 2: Criar `js/home.js`**

```js
import { CONFIG } from './config.js';
import { listarPresentes, modoDemo } from './api.js';
import { formatarMoeda, escapeHtml } from './format.js';
import { calcularContagem } from './contagem.js';
import { iconeSvg, preencherIcones } from './icons.js';
import { mostrarBannerDemo } from './ui.js';

preencherIcones(document);
if (modoDemo) mostrarBannerDemo();
iniciarContagem();
carregarPresentes();

function iniciarContagem() {
  const el = document.getElementById('contagem');
  const alvo = Date.parse(CONFIG.dataCasamento);
  const campos = Object.fromEntries([...el.querySelectorAll('[data-unidade]')].map((s) => [s.dataset.unidade, s]));

  function atualizar() {
    const c = calcularContagem(alvo, Date.now());
    if (c.fase !== 'antes') {
      clearInterval(timer);
      el.innerHTML = `<p class="contagem__fim">${c.fase === 'hoje' ? 'Hoje é o grande dia!' : 'Obrigado por celebrar conosco!'}</p>`;
      return;
    }
    for (const unidade of ['dias', 'horas', 'minutos', 'segundos']) {
      campos[unidade].textContent = String(c[unidade]).padStart(2, '0');
    }
  }
  const timer = setInterval(atualizar, 1000);
  atualizar();
}

async function carregarPresentes() {
  const grid = document.getElementById('lista-presentes');
  grid.innerHTML = '<p class="estado" style="grid-column:1/-1">Carregando presentes…</p>';
  try {
    const presentes = await listarPresentes();
    const ordenados = [...presentes].sort((a, b) => Number(a.esgotado) - Number(b.esgotado));
    grid.innerHTML = ordenados.map(cartaoPresente).join('');
  } catch (err) {
    console.error(err);
    grid.innerHTML = `
      <div class="estado" style="grid-column:1/-1">
        <p>Não conseguimos carregar a lista agora. Tente novamente em instantes.</p>
        <button class="botao" type="button" id="tentar-novamente">Tentar novamente</button>
      </div>`;
    document.getElementById('tentar-novamente').addEventListener('click', carregarPresentes);
  }
}

function cartaoPresente(p) {
  const icone = p.imagem
    ? `<img src="${escapeHtml(p.imagem)}" alt="" loading="lazy">`
    : iconeSvg(p.icone || p.id);
  const link = `presente.html?id=${encodeURIComponent(p.id)}`;

  if (p.livre) {
    return `
      <article class="presente presente--livre">
        <div class="presente__icone">${icone}</div>
        <h3>${escapeHtml(p.nome)}</h3>
        <p>${escapeHtml(p.descricao)}</p>
        <div class="presente__valor">Valor livre</div>
        <a class="botao botao--cheio" href="${link}">Presentear</a>
      </article>`;
  }

  const pct = Math.round((p.cotas_vendidas / p.qtd_cotas) * 100);
  return `
    <article class="presente${p.esgotado ? ' presente--esgotado' : ''}">
      ${p.esgotado ? '<span class="selo">Esgotado</span>' : ''}
      <div class="presente__icone">${icone}</div>
      <h3>${escapeHtml(p.nome)}</h3>
      <p>${escapeHtml(p.descricao)}</p>
      <div class="presente__valor">${formatarMoeda(p.valor_cota)} <small>por cota</small></div>
      <div class="progresso" role="progressbar" aria-valuemin="0" aria-valuemax="${p.qtd_cotas}" aria-valuenow="${p.cotas_vendidas}" aria-label="Cotas presenteadas"><span style="width:${pct}%"></span></div>
      <div class="presente__cotas">${p.cotas_vendidas} de ${p.qtd_cotas} cotas</div>
      ${p.esgotado
        ? '<button class="botao" type="button" disabled>Esgotado</button>'
        : `<a class="botao botao--cheio" href="${link}">Presentear</a>`}
    </article>`;
}
```

- [ ] **Step 3: Verificar no navegador**

Iniciar preview (`preview_start` com nome `site`, ou `python -m http.server 8080`) e abrir `http://localhost:8080/`.
Checar:
- Banner "Modo demonstração" no topo; contagem regressiva atualizando a cada segundo.
- Ramos nos cantos do hero; versículo; cartões de evento com ícones de igreja e taças.
- 14 cartões de presente; `airfryer` no fim com selo "Esgotado" e botão desabilitado; "Valor livre" sem barra.
- Console sem erros (`read_console_messages` com `onlyErrors`).
- `resize_window` preset `mobile` (375px): sem rolagem horizontal (`document.documentElement.scrollWidth <= 375` via `javascript_tool`), menu com 3 links visíveis. Depois voltar ao preset `desktop`.

- [ ] **Step 4: Commit**

```bash
git add index.html js/home.js
git commit -m "feat: página principal com contagem, evento e lista de presentes

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Página de presentear (`presente.html` + `js/presente.js`)

**Files:**
- Create: `presente.html`, `js/presente.js`

**Interfaces:**
- Consumes: `CONFIG`, `obterPresente`, `enviarContribuicao`, `modoDemo`, `formatarMoeda`, `parseMoeda`, `escapeHtml`, `gerarPayloadPix`, `iconeSvg`, `preencherIcones`, `mostrarBannerDemo`; global `qrcode` de `qrcode-generator` 1.4.4 (`qrcode(typeNumber, ecLevel)`, `.addData()`, `.make()`, `.getModuleCount()`, `.isDark(r, c)`).

- [ ] **Step 1: Criar `presente.html`**

```html
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Presentear · Gustavo & Caroline</title>
  <meta name="robots" content="noindex">
  <link rel="icon" href="assets/favicon.svg" type="image/svg+xml">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400&family=Pinyon+Script&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="css/style.css">
  <script src="https://cdnjs.cloudflare.com/ajax/libs/qrcode-generator/1.4.4/qrcode.min.js"></script>
</head>
<body>
  <nav class="nav" aria-label="Principal">
    <div class="container">
      <a class="nav__marca" href="index.html">G &amp; C</a>
      <ul class="nav__links"><li><a href="index.html#presentes">Lista de presentes</a></li></ul>
    </div>
  </nav>

  <main class="pagina-presente">
    <a class="voltar" href="index.html#presentes">← Voltar à lista</a>

    <section class="painel" id="etapa-carregando"><p>Carregando…</p></section>

    <section class="painel" id="etapa-aviso" hidden>
      <div class="presente__icone" data-icone="presente"></div>
      <p id="aviso-texto"></p>
      <div class="botoes">
        <a class="botao botao--cheio" href="index.html#presentes">Ver a lista</a>
        <button class="botao" type="button" id="aviso-tentar" hidden>Tentar novamente</button>
      </div>
    </section>

    <section class="painel" id="etapa-escolha" hidden>
      <div class="presente__icone" id="escolha-icone"></div>
      <h1 id="escolha-nome"></h1>
      <p id="escolha-descricao"></p>

      <div id="bloco-cotas">
        <p class="rotulo" id="escolha-cota"></p>
        <div class="seletor">
          <button type="button" id="menos" aria-label="Menos uma cota">−</button>
          <output id="quantidade" aria-live="polite">1</output>
          <button type="button" id="mais" aria-label="Mais uma cota">+</button>
        </div>
        <p class="dica" id="restantes"></p>
      </div>

      <label class="campo" id="bloco-livre" hidden>
        <span>Valor do presente (R$)</span>
        <input id="valor-livre" inputmode="decimal" autocomplete="off" placeholder="Ex.: 150,00">
      </label>

      <p class="total">Total: <strong id="total">R$ 0,00</strong></p>
      <p class="erro" id="escolha-erro" hidden></p>
      <button class="botao botao--cheio botao--largo" type="button" id="ir-pagamento">Continuar para o Pix</button>
    </section>

    <section class="painel" id="etapa-pagamento" hidden>
      <h2>Pix</h2>
      <p class="instrucao">Abra o app do seu banco, escolha <strong>Pix → Ler QR Code</strong> e aponte para o código abaixo.</p>
      <div class="qr" id="qr"></div>
      <p class="total"><strong id="pagamento-total"></strong></p>
      <p class="recebedor">Confira se o recebedor é <strong id="recebedor"></strong>.</p>
      <p class="dica">Está no celular? Use o Pix Copia e Cola:</p>
      <div class="copia-cola" id="copia-cola"></div>
      <div class="botoes">
        <button class="botao" type="button" id="copiar">Copiar código Pix</button>
      </div>
      <button class="botao botao--cheio botao--largo" type="button" id="ja-paguei" style="margin-top:24px">Já fiz o Pix</button>
      <div class="botoes"><button class="botao" type="button" id="voltar-escolha" style="border:0">← Alterar valor</button></div>
    </section>

    <section class="painel" id="etapa-recado" hidden>
      <h2>Deixe um recado</h2>
      <p class="instrucao">Seu recado será lido apenas pelos noivos.</p>
      <form id="form-recado" novalidate>
        <label class="campo">
          <span>Seu nome</span>
          <input id="nome" name="nome" maxlength="80" autocomplete="name" required>
        </label>
        <label class="campo">
          <span>Recado (opcional)</span>
          <textarea id="recado" name="recado" maxlength="1000"></textarea>
        </label>
        <p class="erro" id="recado-erro" hidden></p>
        <button class="botao botao--cheio botao--largo" type="submit" id="enviar">Enviar</button>
      </form>
    </section>

    <section class="painel" id="etapa-obrigado" hidden>
      <div class="divisor" data-icone="coracoes"></div>
      <h2>Muito obrigado!</h2>
      <p id="obrigado-texto"></p>
      <div class="botoes"><a class="botao botao--cheio" href="index.html#presentes">Voltar à lista</a></div>
    </section>
  </main>

  <script type="module" src="js/presente.js"></script>
</body>
</html>
```

- [ ] **Step 2: Criar `js/presente.js`**

```js
import { CONFIG } from './config.js';
import { obterPresente, enviarContribuicao, modoDemo } from './api.js';
import { formatarMoeda, parseMoeda, escapeHtml } from './format.js';
import { gerarPayloadPix } from './pix.js';
import { iconeSvg, preencherIcones } from './icons.js';
import { mostrarBannerDemo } from './ui.js';

const $ = (id) => document.getElementById(id);
const ETAPAS = ['carregando', 'aviso', 'escolha', 'pagamento', 'recado', 'obrigado'];
const ERROS = {
  nao_encontrado: 'Este presente não está mais disponível.',
  cotas_invalidas: 'Quantidade de cotas inválida.',
  valor_invalido: 'Valor inválido.',
  nome_invalido: 'Informe seu nome (até 80 caracteres).',
  recado_invalido: 'O recado pode ter até 1000 caracteres.',
};

const estado = { presente: null, quantidade: 1, valor: 0, payload: '' };

preencherIcones(document);
if (modoDemo) mostrarBannerDemo();
carregar();

function mostrar(etapa) {
  for (const e of ETAPAS) $(`etapa-${e}`).hidden = e !== etapa;
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function aviso(texto, podeTentar = false) {
  $('aviso-texto').textContent = texto;
  $('aviso-tentar').hidden = !podeTentar;
  mostrar('aviso');
}

async function carregar() {
  mostrar('carregando');
  const id = new URLSearchParams(location.search).get('id');
  let presente;
  try {
    presente = id ? await obterPresente(id) : null;
  } catch (err) {
    console.error(err);
    return aviso('Não conseguimos carregar o presente agora. Tente novamente em instantes.', true);
  }
  if (!presente) return aviso('Presente não encontrado.');
  if (presente.esgotado) return aviso('Este presente já foi todo presenteado. Que tal escolher outro?');
  estado.presente = presente;
  renderEscolha();
}

function restantes() {
  const p = estado.presente;
  return p.qtd_cotas - p.cotas_vendidas;
}

function renderEscolha() {
  const p = estado.presente;
  $('escolha-icone').innerHTML = p.imagem ? `<img src="${escapeHtml(p.imagem)}" alt="">` : iconeSvg(p.icone || p.id);
  $('escolha-nome').textContent = p.nome;
  $('escolha-descricao').textContent = p.descricao;
  $('bloco-cotas').hidden = p.livre;
  $('bloco-livre').hidden = !p.livre;
  if (!p.livre) {
    $('escolha-cota').textContent = `${formatarMoeda(p.valor_cota)} por cota`;
    $('restantes').textContent = `${restantes()} cota(s) disponível(is)`;
  }
  atualizarTotal();
  mostrar('escolha');
}

function atualizarTotal() {
  const p = estado.presente;
  if (p.livre) {
    const v = parseMoeda($('valor-livre').value);
    estado.valor = Number.isNaN(v) ? 0 : v;
  } else {
    $('quantidade').textContent = estado.quantidade;
    $('menos').disabled = estado.quantidade <= 1;
    $('mais').disabled = estado.quantidade >= restantes();
    estado.valor = Math.round(estado.quantidade * p.valor_cota * 100) / 100;
  }
  $('total').textContent = formatarMoeda(estado.valor);
}

$('menos').addEventListener('click', () => { estado.quantidade = Math.max(1, estado.quantidade - 1); atualizarTotal(); });
$('mais').addEventListener('click', () => { estado.quantidade = Math.min(restantes(), estado.quantidade + 1); atualizarTotal(); });
$('valor-livre').addEventListener('input', atualizarTotal);
$('aviso-tentar').addEventListener('click', carregar);
$('voltar-escolha').addEventListener('click', () => mostrar('escolha'));
$('ja-paguei').addEventListener('click', () => { mostrar('recado'); $('nome').focus(); });

$('ir-pagamento').addEventListener('click', () => {
  const erro = $('escolha-erro');
  erro.hidden = true;
  if (estado.presente.livre && (estado.valor < 1 || estado.valor > 100000)) {
    erro.textContent = 'Informe um valor entre R$ 1,00 e R$ 100.000,00.';
    erro.hidden = false;
    return;
  }
  if (!CONFIG.chavePix) {
    erro.textContent = 'Chave Pix não configurada (js/config.js).';
    erro.hidden = false;
    console.error('[casamento] CONFIG.chavePix vazio.');
    return;
  }
  estado.payload = gerarPayloadPix({
    chave: CONFIG.chavePix,
    nome: CONFIG.nomeRecebedor,
    cidade: CONFIG.cidade,
    valor: estado.valor,
  });
  $('qr').innerHTML = qrSvg(estado.payload);
  $('copia-cola').textContent = estado.payload;
  $('pagamento-total').textContent = formatarMoeda(estado.valor);
  $('recebedor').textContent = CONFIG.nomeRecebedor;
  $('copiar').textContent = 'Copiar código Pix';
  mostrar('pagamento');
});

$('copiar').addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(estado.payload);
    $('copiar').textContent = 'Copiado!';
  } catch {
    const selecao = window.getSelection();
    const faixa = document.createRange();
    faixa.selectNodeContents($('copia-cola'));
    selecao.removeAllRanges();
    selecao.addRange(faixa);
    $('copiar').textContent = 'Selecionado — copie manualmente';
  }
});

$('form-recado').addEventListener('submit', async (ev) => {
  ev.preventDefault();
  const erro = $('recado-erro');
  const botao = $('enviar');
  const nome = $('nome').value.trim();
  const recado = $('recado').value.trim();
  erro.hidden = true;
  if (!nome || nome.length > 80) {
    erro.textContent = ERROS.nome_invalido;
    erro.hidden = false;
    return;
  }
  botao.disabled = true;
  botao.textContent = 'Enviando…';
  try {
    const p = estado.presente;
    const resposta = await enviarContribuicao({
      id: p.id,
      cotas: p.livre ? 0 : estado.quantidade,
      valor: estado.valor,
      nome,
      recado,
    });
    if (!resposta.ok) throw Object.assign(new Error(resposta.erro), { codigo: resposta.erro });
    $('obrigado-texto').textContent = `${nome}, seu carinho agora faz parte da nossa história. Mal podemos esperar para celebrar com você!`;
    mostrar('obrigado');
  } catch (err) {
    console.error(err);
    erro.textContent = ERROS[err.codigo] || 'Não foi possível enviar. Verifique sua conexão e tente novamente.';
    erro.hidden = false;
  } finally {
    botao.disabled = false;
    botao.textContent = 'Enviar';
  }
});

function qrSvg(texto) {
  const qr = qrcode(0, 'M');
  qr.addData(texto);
  qr.make();
  const n = qr.getModuleCount();
  let d = '';
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (qr.isDark(r, c)) d += `M${c},${r}h1v1h-1z`;
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-2 -2 ${n + 4} ${n + 4}" shape-rendering="crispEdges" role="img" aria-label="QR Code Pix"><rect x="-2" y="-2" width="${n + 4}" height="${n + 4}" fill="#fff"/><path d="${d}" fill="#1f2d4d"/></svg>`;
}
```

- [ ] **Step 3: Verificar no navegador (modo demo)**

Com o preview rodando:
1. Temporariamente pôr em `js/config.js` `chavePix: '123e4567-e12b-12d1-a456-426655440000'` (chave de exemplo do Bacen; **não commitar**).
2. Abrir `http://localhost:8080/presente.html?id=cafe`: preço "R$ 50,00 por cota"; `+`/`−` ajustam o total; `−` desabilitado em 1; `+` desabilita ao atingir 12 restantes.
3. "Continuar para o Pix" → QR renderizado, texto copia-e-cola começa com `000201` e contém `540` + valor; "Copiar código Pix" vira "Copiado!".
4. Validar o payload exibido: via `javascript_tool`, `document.getElementById('copia-cola').textContent` e, no terminal, conferir o CRC com `node -e "import('./js/pix.js').then(m=>{const p=process.argv[1];console.log(m.crc16(p.slice(0,-4))===p.slice(-4))})" "<payload>"` → `true`.
5. "Já fiz o Pix" → enviar sem nome mostra erro; com nome → tela "Muito obrigado!".
6. `?id=livre`: campo de valor; `0,50` → erro de faixa; `150,00` → QR com `5406150.00`.
7. `?id=airfryer` → aviso de esgotado; `?id=xyz` → "Presente não encontrado."
8. Mobile (375px): sem rolagem horizontal; QR legível. Voltar a `desktop`.
9. Reverter `chavePix` para `''` (`git diff js/config.js` deve estar vazio).

- [ ] **Step 4: Commit**

```bash
git add presente.html js/presente.js
git commit -m "feat: página de presentear com QR Code Pix e recado

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Imagem de compartilhamento + README

**Files:**
- Create: `assets/og.html`, `assets/og.png`, `README.md`

- [ ] **Step 1: Criar `assets/og.html`**

```html
<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500&family=Pinyon+Script&display=swap" rel="stylesheet">
<style>
  html, body { margin: 0; width: 1200px; height: 630px; overflow: hidden; }
  body { background: #f5f1e8 url(papel.svg); color: #1f2d4d; font-family: 'Cormorant Garamond', serif; display: grid; place-items: center; text-align: center; position: relative; }
  .borda { position: absolute; inset: 24px; border: 1px solid #1f2d4d55; }
  img { position: absolute; width: 300px; }
  .tl { top: 0; left: 0; transform: scaleY(-1); }
  .br { bottom: 0; right: 0; transform: scaleX(-1); }
  h1 { font-family: 'Pinyon Script', cursive; font-weight: 400; font-size: 130px; line-height: 1.1; margin: 0; }
  p { font-size: 44px; letter-spacing: .08em; margin: 16px 0 0; }
  small { display: block; font-size: 22px; letter-spacing: .4em; text-transform: uppercase; margin-top: 12px; }
</style>
</head>
<body>
  <div class="borda"></div>
  <img class="tl" src="ramo.svg" alt=""><img class="br" src="ramo.svg" alt="">
  <div>
    <h1>Gustavo &amp; Caroline</h1>
    <p>12 de Dezembro de 2026</p>
    <small>Curitiba · PR</small>
  </div>
</body>
</html>
```

- [ ] **Step 2: Gerar `assets/og.png` com Edge headless**

Run (Git Bash, na raiz do projeto):
```bash
"/c/Program Files (x86)/Microsoft/Edge/Application/msedge.exe" --headless --disable-gpu --hide-scrollbars --window-size=1200,630 --virtual-time-budget=8000 --screenshot="$(cygpath -w "$PWD/assets/og.png")" "file:///$(cygpath -m "$PWD/assets/og.html")"
```
Expected: `assets/og.png` criado. Abrir com a ferramenta Read e confirmar visualmente: nomes em script, data, ramos nos cantos, sem cortes. Se as fontes não carregarem (texto em serif padrão), aumentar `--virtual-time-budget` para 15000 e repetir.

- [ ] **Step 3: Criar `README.md`**

````markdown
# Gustavo & Caroline — Site do Casamento

Site estático (GitHub Pages) com informações do casamento e lista de presentes em cotas pagos via Pix. Os recados e o controle de cotas ficam numa planilha Google privada.

- Site: https://gustavo-inteknet.github.io/casamento/
- Painel de administração: a planilha Google (abas **Presentes** e **Contribuicoes**)

## 1. Chave Pix

No app do Nubank: **Área Pix → Minhas chaves → Cadastrar chave → Chave aleatória**.
Use **somente a chave aleatória**: o código do site é público e a chave fica visível.

## 2. Planilha e Apps Script (uma vez, ~10 min)

1. Crie uma planilha em https://sheets.new (ex.: "Casamento — Presentes").
2. Menu **Extensões → Apps Script**. Apague o conteúdo e cole todo o arquivo `apps-script/Code.gs`. Salve.
3. No seletor de funções, escolha `configurarPlanilha` e clique **Executar**. Autorize com sua conta Google (tela "app não verificado" → Avançado → Acessar). As abas **Presentes** e **Contribuicoes** serão criadas com a lista inicial.
4. **Implantar → Nova implantação → tipo: App da Web**.
   - Executar como: **Eu**
   - Quem pode acessar: **Qualquer pessoa**
5. Copie a **URL do app da Web** (termina em `/exec`).

> Alterou o `Code.gs` depois? Use **Implantar → Gerenciar implantações → editar (lápis) → Versão: Nova versão** para manter a mesma URL.

## 3. Configurar o site

Edite `js/config.js`:

```js
chavePix: 'sua-chave-aleatoria',
nomeRecebedor: 'Gustavo Gaioski',   // até 25 caracteres, como aparece no banco
cidade: 'Curitiba',
apiUrl: 'https://script.google.com/macros/s/.../exec',
```

Faça commit e push. Em ~1 minuto o GitHub Pages publica.

**Teste obrigatório antes de divulgar:** abra um presente, gere o QR e leia com o app do Nubank. Confira valor e recebedor na tela de confirmação (não precisa concluir o pagamento).

## Administração (planilha)

| Coluna | Uso |
|---|---|
| id | identificador único, sem espaços (não altere depois de divulgar) |
| nome / descricao | texto exibido |
| icone | ícone do presente (`passagens`, `hotel`, `jantar`, `barco`, `geladeira`, `sofa`, `airfryer`, `cafe`, `churrasco`, `mercado`, `plantinha`, `pizza`, `sogra`, `livre`, `presente`) |
| imagem | opcional: URL de uma foto (substitui o ícone) |
| valor_total / qtd_cotas | valor da cota = total ÷ cotas. **0 e 0 = valor livre** |
| ativo | desmarque para esconder o presente |
| ordem | ordem de exibição |

- Mudanças aparecem no site na próxima vez que a página for aberta.
- **Contribuicoes**: cada linha é um "Já fiz o Pix" com nome e recado. Confira com o extrato do Nubank. Se alguém registrou e não pagou, **apague a linha** e a cota volta a ficar disponível.
- `observacao = excedente`: a pessoa pagou quando as cotas já tinham acabado (corrida entre convidados).

## Personalizar

- **Foto do casal:** salve como `assets/casal.jpg` e, em `index.html`, troque `<div class="placeholder">Foto do casal…</div>` por `<img src="assets/casal.jpg" alt="Gustavo e Caroline">`.
- **História:** em `index.html`, seção `#casal`, substitua o `<p class="placeholder">` por seus parágrafos `<p>…</p>`.

## Rodar localmente

```bash
python -m http.server 8080
```
Abra http://localhost:8080. Sem `apiUrl` configurada o site roda em **modo demonstração** (dados de exemplo, nada é gravado).

Testes automatizados (Node 18+):
```bash
npm test
```

## Domínio próprio (futuro)

1. Registre o domínio (ex.: Registro.br).
2. Crie o arquivo `CNAME` na raiz com o domínio (ex.: `gustavoecaroline.com.br`) e faça push.
3. No DNS do domínio:
   - Domínio raiz: registros **A** para `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`
   - `www`: registro **CNAME** para `gustavo-inteknet.github.io`
4. GitHub → repositório → **Settings → Pages**: confirme o domínio e marque **Enforce HTTPS**.
5. Atualize a URL da tag `og:image` em `index.html` para o novo domínio.

Referência: https://docs.github.com/pages/configuring-a-custom-domain-for-your-github-pages-site

## Segurança

- Chave Pix **aleatória** apenas; nunca CPF/telefone no código.
- Divulgue só o link oficial; a página mostra o nome do recebedor para o convidado conferir.
- A URL do Apps Script é pública: registros falsos são possíveis, mas o servidor valida os dados e você pode apagar linhas na planilha.
- Recados nunca saem da planilha pela API.
````

- [ ] **Step 4: Commit**

```bash
git add assets/og.html assets/og.png README.md
git commit -m "docs: README de configuração e imagem de compartilhamento

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: Publicar no GitHub Pages

**Files:** nenhum novo.

- [ ] **Step 1: Pré-checagem**

Run: `npm test` → PASS. Run: `git status` → limpo. Run: `grep -n "chavePix\|apiUrl" js/config.js` → ambos `''` (publicação em modo demo até a Task 10).

- [ ] **Step 2: Criar repositório e enviar**

```bash
gh repo create gustavo-inteknet/casamento --public --source . --remote origin --push --description "Site do casamento Gustavo & Caroline"
```
Expected: URL `https://github.com/gustavo-inteknet/casamento` e push de `main`.

- [ ] **Step 3: Ativar GitHub Pages**

```bash
gh api -X POST repos/gustavo-inteknet/casamento/pages -f "source[branch]=main" -f "source[path]=/"
```
Expected: JSON com `"html_url": "https://gustavo-inteknet.github.io/casamento/"`. Se retornar 409 (já existe), seguir.

- [ ] **Step 4: Aguardar build e verificar**

Run: `gh api repos/gustavo-inteknet/casamento/pages/builds/latest --jq .status` até `built` (checar a cada ~30 s, poucas vezes).
Abrir `https://gustavo-inteknet.github.io/casamento/` no navegador interno: página carrega, CSS aplicado, lista em modo demo, `presente.html?id=cafe` abre. `https://gustavo-inteknet.github.io/casamento/assets/og.png` retorna a imagem.

---

### Task 10: Configuração real e teste ponta a ponta (com o usuário)

**Files:**
- Modify: `js/config.js` (`chavePix`, `apiUrl`, `nomeRecebedor` se necessário)

- [ ] **Step 1: Usuário executa seções 1 e 2 do README** (chave aleatória, planilha, `configurarPlanilha`, implantação) e informa a chave aleatória e a URL `/exec`.

- [ ] **Step 2: Testar a API antes de plugar**

```bash
curl -sL "<URL_EXEC>?action=presentes" | head -c 400
```
Expected: `{"ok":true,"presentes":[{"id":"passagens",...` sem campos `nome`/`recado` de convidados.

- [ ] **Step 3: Atualizar `js/config.js`** com `chavePix` e `apiUrl`; conferir `nomeRecebedor` igual ao titular exibido pelo Nubank (≤ 25 caracteres).

- [ ] **Step 4: Teste local ponta a ponta**

Preview local → `presente.html?id=mercado` → 1 cota → QR. **Usuário lê o QR com o app do Nubank** e confirma valor R$ 50,00 e recebedor (sem concluir). Depois "Já fiz o Pix" com nome "Teste" e recado "teste" → tela de obrigado. Conferir nova linha na aba **Contribuicoes** e, recarregando `index.html`, "1 de 6 cotas" em "Primeira compra do mercado a dois". Usuário apaga a linha de teste na planilha.

- [ ] **Step 5: Commit e push**

```bash
git add js/config.js
git commit -m "chore: configura chave Pix e URL do Apps Script

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git push
```

- [ ] **Step 6: Verificação final no site publicado** — repetir o passo 4 em `https://gustavo-inteknet.github.io/casamento/` (sem gravar recado, ou apagando depois).
