# Barbearia WM — performance sem mudança de identidade

Preservar o layout e as regras responsivas existentes: fundo #090807, superfícies
#15120f, dourado #bc9564, texto #ece5da e secundário #a69b8e. Manter DM Sans,
Manrope e Georgia, botões de vidro, logo existente e um único profissional WM.
Nenhuma fotografia ou pessoa nova será adicionada.

## Layout e componentes

Manter os breakpoints existentes de 620 e 900 px, o espaçamento e as grades dos
serviços. A busca recebe um rótulo visível, resposta de resultados para leitores
de tela e debounce de 250 ms. O histórico mostra até 20 solicitações por página,
com navegação por botões acessíveis. A confirmação continua dependendo do WhatsApp.

## Recursos e movimento

Imagens existentes convertidas para WebP e servidas no mesmo domínio. Hero com
prioridade alta e tamanhos responsivos; imagens abaixo da dobra com lazy loading.
Fontes variáveis locais e font-display: swap. Sem novas dependências de produção.
Preservar as entradas suaves dos botões; observar apenas conteúdo ativo e alterações
relevantes. Respeitar prefers-reduced-motion. Skeleton somente durante o carregamento
real do módulo de histórico, com mensagem de erro e nova tentativa.

## Aceitação

- Home e catálogo presentes no HTML gerado, mesmo antes do JavaScript.
- Busca, navegação, seleção, envio local, cancelamento e retorno continuam funcionais.
- Sem erros de JavaScript, overflow horizontal em 360/390 px ou regressão em desktop.
- Nenhum agendamento apresentado como confirmado pelo servidor.
- Testes com histórico extenso, falha de armazenamento e rede/CPU limitadas.
- Recursos versionados por hash para cache seguro; HTML revalidado a cada acesso.
