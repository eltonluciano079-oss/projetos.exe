# Avaliação de desempenho — Barbearia WM

## Arquitetura encontrada

Site estático, sem React, pacote npm, API, IA, banco ou processador de pagamentos.
Os agendamentos são solicitações locais em `localStorage`, cuja disponibilidade
depende da confirmação da equipe pelo WhatsApp. O projeto Vercel é
`wm-barbearia-preview`; base analisada: `6b0973b5c51a00ac0f75d66f8d292d15b3ecf0b9`.

O JavaScript original falhava ao registrar um evento em `barber-search`, um campo
inexistente. Isso interrompia a renderização inicial do catálogo. O build agora
gera esse conteúdo no HTML. A busca passa a filtrar serviços de verdade.

## Aplicação dos 31 itens

| Item | Resultado nesta versão |
| --- | --- |
| 1. Skeleton | Histórico exibe skeleton acessível durante o import real, erro recuperável e nova tentativa. Conteúdo estático aparece imediatamente. |
| 2. Debounce | Busca de serviços com 250 ms, normalização de acentos e nenhuma renderização para consulta equivalente. Não há autocomplete. |
| 3. Streaming de IA | Não aplicável: nenhuma funcionalidade de IA. |
| 4. Atualização otimista | Não aplicável a servidor: não existe API. Escritas locais são confirmadas antes de alterar a interface; falhas preservam o estado anterior. |
| 5. Lazy loading | Fotos dos cartões com `loading="lazy"`, dimensões e decodificação assíncrona. Hero é prioritário, sem lazy loading. |
| 6. Renderizações | Controles preservados ao selecionar; só a etapa ativa é construída. Observer de movimento não reage às próprias classes. |
| 7. Virtualização | Adotada paginação de 20 registros para limitar o DOM; não há virtualização com rolagem contínua. O catálogo tem apenas oito itens. |
| 8. WebP/AVIF | Logo e fotos convertidas para WebP; hero em tamanhos para celular e desktop. |
| 9. CDN | Recursos locais preparados para a CDN da Vercel já utilizada pelo projeto. Efetivação depende do deploy desta branch. |
| 10. Brotli/Gzip | Negociação automática da plataforma Vercel. Sem Content-Encoding fixo nem arquivos pré-comprimidos sem negociação. Verificar a resposta da prévia. |
| 11. Dependências | Nenhuma dependência de produção adicionada; o projeto não tinha pacote npm para remover. Retirados preconnects duplicados e código de inicialização obsoleto. |
| 12. SSR/SSG | Home e catálogo gerados no build, sem servidor de renderização. |
| 13. Terceiros | Não há scripts de terceiros; também eliminadas requisições externas de imagens e fontes no carregamento da página. |
| 14. Divisão de JavaScript | Módulo do histórico carregado somente ao abrir a seção; módulo principal é deferido por `type="module"`. |
| 15. Cache do navegador | Arquivos com hash no nome e cache immutable de um ano; HTML sempre revalidado. Configurado em `vercel.json`. |
| 16. Fontes locais | Duas fontes WOFF2 variáveis com pesos 400–800 e `font-display:swap`, preservando a tipografia existente. Licenças incluídas. |
| 17. Chamadas duplicadas | Não há APIs. Import do histórico deduplicado enquanto carrega; leitura/parse do armazenamento em cache com invalidação entre abas. |
| 18. Paginação da API | Não há API. O histórico local é paginado; não altera nem descarta os registros armazenados. |
| 19. Filas | Não aplicável: não há trabalho demorado de backend. |
| 20. Timeouts externos | Não há chamadas de serviço externo. O carregamento do módulo do histórico tem limite de 12 s e nova tentativa. |
| 21. Paralelismo | Sem cadeia de APIs. Preload do recurso principal/fontes e carregamento nativo dos módulos/recursos pelo navegador. |
| 22. OpenTelemetry | Pendente de backend/serviço a instrumentar e destino de coleta. Nenhum coletor fictício adicionado. |
| 23. N+1 | Não aplicável: não há consultas ao banco. |
| 24. Redis | Não aplicável à versão estática; não provisionado. |
| 25. Índices | Não aplicável: não há banco. |
| 26. Colunas necessárias | Não aplicável: não há consultas. |
| 27. Pool de conexões | Não aplicável: não há conexões de banco. |
| 28. Proximidade do banco | Não aplicável: sem banco/backend. |
| 29. Múltiplas instâncias | Recursos estáticos servidos pela CDN; não há processo de aplicação para balancear. |
| 30. Monitoramento real | Não ativado. Requer escolher/habilitar um serviço de RUM e definir a coleta. Métricas locais dos testes não são dados de usuários reais. |
| 31. Celular/rede lenta | Testes Chromium em 360, 390 e 1440 px; simulação móvel com CPU 4× mais lenta, latência 150 ms e download 200 KB/s. Não testado em aparelho físico. |

## Redução dos recursos

Valores em bytes, sem compressão HTTP:

| Recurso | Original | Novo |
| --- | ---: | ---: |
| Logo | 613.480 | 6.508 |
| Hero no celular | 153.239 | 34.784 |
| Hero no desktop | 153.239 | 85.228 |
| Foto de corte | 867.238 | 47.956 |
| Foto de ferramentas | 104.292 | 36.572 |
| Foto do combo | 841.262 | 83.676 |

CSS e scripts foram extraídos do HTML para permitir cache independente. A redução
do tamanho do HTML isoladamente não representa toda a transferência da primeira
visita. As imagens dos serviços passam a aparecer corretamente após a correção
do erro de inicialização; comparação do LCP com a versão quebrada seria enganosa.

## Verificação e publicação

Executar `node scripts/build.mjs` e `python tests/browser.py`. Testes cobrem busca,
foco estável, seleção, datas sem domingo/segunda, envio local, cancelamento,
persistência, histórico de 1.003 registros, sincronização entre abas, quota de
armazenamento, falha/retry do módulo, skeleton, layout e conteúdo sem JavaScript.
Screenshots e medições sintéticas ficam em `artifacts/`.

Execução final local: **PASS**, nenhum erro de JavaScript. Na simulação móvel,
LCP/FCP de **1.776 ms** e CLS **0** nessa execução, com servidor local sem
compressão HTTP. São métricas sintéticas de uma execução, não percentis de campo
nem garantia de tempo em redes reais. Desktop e celular foram inspecionados
visualmente; animações estabilizam sem mutações contínuas quando a página está ociosa.

Depois de publicar a prévia, confirmar que o build usa `dist/`, que os assets são
encontrados e que as respostas apresentam cache e compressão corretos. A migração
para API/banco é uma fase separada: não criar confirmação de horário ou cobrança
apenas no cliente. Nenhum dado local existente é enviado a novos serviços.
