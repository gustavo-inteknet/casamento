# Gustavo & Caroline — Site do Casamento

Site estático (GitHub Pages) com informações do casamento e lista de presentes em cotas pagos via Pix. Os recados e o controle de cotas ficam numa planilha Google privada.

- Site: https://casamento.gaioski.com.br/
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

**Teste obrigatório antes de divulgar:** abra um presente, gere o QR e leia com o app do Nubank. Confira valor e recebedor na tela de confirmação (não precisa concluir o pagamento). Depois, clique em "Já fiz o Pix", envie um recado de teste e confirme que a linha aparece na aba **Contribuicoes**; em seguida apague-a. Isso valida a implantação do Apps Script (acesso "Qualquer pessoa" e URL `/exec`).

## Administração (planilha)

| Coluna | Uso |
|---|---|
| id | identificador único, sem espaços (não altere depois de divulgar); use letras (não apenas números, ex.: `001`) |
| nome / descricao | texto exibido |
| icone | ícone do presente (`passagens`, `hotel`, `jantar`, `barco`, `geladeira`, `sofa`, `airfryer`, `cafe`, `churrasco`, `mercado`, `plantinha`, `pizza`, `sogra`, `livre`, `presente`) |
| imagem | opcional: URL de uma foto (substitui o ícone) |
| valor_total / qtd_cotas | valor da cota = total ÷ cotas. **0 e 0 = valor livre** |
| ativo | desmarque para esconder o presente; linhas novas precisam da caixa marcada (célula vazia = oculto) |
| ordem | ordem de exibição |

- Mudanças aparecem no site na próxima vez que a página for aberta.
- **Contribuicoes**: cada linha é um "Já fiz o Pix" com nome e recado, e entra **pendente** (caixa `confirmado` desmarcada).
  - Confira o extrato do Nubank e **marque `confirmado`**: só então a cota sai da lista pública.
  - Pix não recebido ou linha repetida: deixe desmarcado ou apague a linha.
- `observacao = excedente`: a pessoa pagou quando as cotas (confirmadas) já tinham acabado.
- Proteções: o servidor aceita até 30 envios a cada 10 minutos e ignora envios de robôs (campo-isca invisível).

### Atualizar o Apps Script após mudanças no `Code.gs`

1. Extensões → Apps Script: substitua todo o código pelo `apps-script/Code.gs` atual e salve.
2. Execute `configurarPlanilha` (seguro rodar de novo: não apaga dados, só adiciona colunas novas) e autorize se o Google pedir.
3. **Implantar → Gerenciar implantações → lápis → Versão: Nova versão → Implantar.** A URL `/exec` continua a mesma.

## Personalizar

- **Fotos do casal:** `assets/casal.jpg` (vertical, recortada) e `assets/casal-2.jpg` (horizontal). Para trocar, substitua os arquivos mantendo os nomes.
- **História:** em `index.html`, seção `#casal`, edite os parágrafos `<p>…</p>`.

## Rodar localmente

```bash
python -m http.server 5173
```
Abra http://localhost:5173. Sem `apiUrl` configurada o site roda em **modo demonstração** (dados de exemplo, nada é gravado).

Testes automatizados (Node 18+):
```bash
npm test
```

## Domínio próprio

O site usa **casamento.gaioski.com.br** (domínio no Registro.br, DNS no Cloudflare):

- Arquivo `CNAME` na raiz do repositório com `casamento.gaioski.com.br`.
- Cloudflare → DNS: registro **CNAME** `casamento` → `gustavo-inteknet.github.io`, com proxy **desligado** (nuvem cinza, "Somente DNS"). Com o proxy ligado, o GitHub não consegue emitir o certificado HTTPS.
- GitHub → repositório → **Settings → Pages**: domínio `casamento.gaioski.com.br` e **Enforce HTTPS** marcado.
- As tags `og:url` e `og:image` em `index.html` apontam para o domínio.

Para trocar de domínio: atualize o `CNAME`, o DNS e as duas tags `og:*`.

Referência: https://docs.github.com/pages/configuring-a-custom-domain-for-your-github-pages-site

## Segurança

- Chave Pix **aleatória** apenas; nunca CPF/telefone no código.
- Divulgue só o link oficial; a página mostra o nome do recebedor para o convidado conferir.
- A URL do Apps Script é pública: registros falsos são possíveis, mas o servidor valida os dados e você pode apagar linhas na planilha.
- Recados nunca saem da planilha pela API.
