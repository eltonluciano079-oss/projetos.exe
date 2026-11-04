# Barbearia WM

Site estático da Barbearia WM, com solicitações de agendamento salvas no navegador
e confirmação de disponibilidade pelo WhatsApp. Não há API, cobrança ou banco de
dados conectado nesta versão.

## Build e desenvolvimento

Requer Node.js 20 ou posterior, sem instalação de pacotes:

```sh
node scripts/build.mjs
python -m http.server 8766 --directory dist
```

Abra http://localhost:8766. Edite `index.html` (template), `src/` e `assets/`;
execute o build novamente após alterações. `dist/` é gerado e não é versionado.
O build gera `/` e `/wm-atualizado.html` a partir do mesmo template; o arquivo
antigo `wm-atualizado.html` na raiz permanece apenas como referência histórica.

`vercel.json` configura o build, diretório de saída e cache. A Vercel distribui os
arquivos estáticos por sua CDN e negocia compressão HTTP. Não configurar um
Content-Encoding fixo: o algoritmo depende de Accept-Encoding e do conteúdo.
Validar cabeçalhos na prévia após o deploy.

## Testes

Com Python Playwright e Chromium disponíveis no ambiente:

```sh
python tests/browser.py
```

Os testes usam o servidor local na porta 8766; `WM_TEST_URL` permite outra URL.
Screenshots e métricas sintéticas são gravados em `artifacts/`, ignorado no Git.
Os testes não enviam mensagens pelo WhatsApp nem alteram dados de produção.

Veja [PERFORMANCE.md](PERFORMANCE.md) para o resultado da avaliação dos 31 itens
e [DESIGN.md](DESIGN.md) para as restrições visuais e critérios de aceitação.
