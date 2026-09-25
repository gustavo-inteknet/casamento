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
- **Contribuicoes**: cada linha é um "Já fiz o Pix" com nome e recado. Confira com o extrato do Nubank. Se alguém registrou e não pagou, **apague a linha** e a cota volta a ficar disponível. Uma linha repetida (convidado tentou enviar de novo) também pode ser apagada.
- `observacao = excedente`: a pessoa pagou quando as cotas já tinham acabado (corrida entre convidados).

## Personalizar

- **Foto do casal:** salve como `assets/casal.jpg` e, em `index.html`, troque `<div class="placeholder">Foto do casal…</div>` por `<img src="assets/casal.jpg" alt="Gustavo e Caroline">`.
- **História:** em `index.html`, seção `#casal`, substitua o `<p class="placeholder">` por seus parágrafos `<p>…</p>`.

## Rodar localmente

```bash
python -m http.server 5173
```
Abra http://localhost:5173. Sem `apiUrl` configurada o site roda em **modo demonstração** (dados de exemplo, nada é gravado).

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
