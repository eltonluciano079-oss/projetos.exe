# WM Barbearia — entrega do MVP de agendamento

Atualização: 9 de novembro de 2026 (horário de Brasília). Fonte oficial: branch `main` em `eltonluciano079-oss/projetos.exe`.

## Endereços
- Aplicativo: https://project31905.websitepublisher.ai/index.html
- Repositório: https://github.com/eltonluciano079-oss/projetos.exe
- Supabase: projeto `wm-barbearia`, referência pública `atzuglibamukkwhigmmq`, região `sa-east-1`.
- Schema versionado: `supabase/migrations/20261109020638_wm_booking_backend_mvp.sql`.

## Funcionalidades concluídas
- Site estático em `index.html`, design WM preto/dourado preservado.
- Consulta real de horários no Supabase via RPC `wm_busy`.
- Reserva transacional via `wm_reserve`, com validação de serviço, datas, preço, funcionamento e duração.
- Restrição PostgreSQL de intervalos sobrepostos para reservas ativas. Isso evita duas reservas simultâneas para o único profissional.
- Cancelamento por token aleatório de 256 bits, cujo hash SHA-256 fica salvo no banco. Sem cadastro de usuário.
- Consulta de status `wm_status` apenas quando o navegador tem o token correto.
- Histórico em `localStorage` vinculado a este dispositivo; o agendamento em si fica no servidor.
- Mensagens de WhatsApp predefinidas para comunicar reserva/cancelamento à barbearia.
- Nenhuma senha ou chave de servidor Supabase no código cliente. Somente a chave publicável de baixo privilégio.
- RLS habilitado na tabela; acesso anônimo à tabela negado. As operações passam por RPCs com validações.

## Regras do MVP
- Atendimento: terça a sexta 09:00–20:00; sábado 09:00–22:00.
- Um único profissional; horários de início disponíveis por hora cheia, respeitando a duração total.
- Agenda abre para os próximos 30 dias; interface lista 12 dias úteis de atendimento.
- Serviços e preços: corte masculino R$40/40min; barba R$30/30min; combo R$55/70min; corte infantil R$35/40min (estimado); sobrancelha R$10/20min (estimado); pezinho R$15/15min (estimado); pigmentação R$30/30min (estimado); hidratação R$25/30min (estimado).
- Preços e durações estão tanto no frontend quanto na função privada do banco. Alterações exigem atualização sincronizada.
- O cliente deve clicar em **Avisar a WM pelo WhatsApp** depois de reservar. **Mensagens não são enviadas automaticamente.**
- A barbearia acompanha as solicitações pelo WhatsApp. **Não há painel administrativo nem confirmação automática por mensagem** nesta versão.
- Pagamento: preferência registrada no frontend; nenhum pagamento online é processado.

## Testes executados (09/11/2026)
1. SQL com role `anon`: reserva, consulta de ocupação, bloqueio de conflito, consulta de status com código correto e incorreto, cancelamento válido/inválido e liberação do horário. O teste SQL usou transação revertida.
2. Navegador remoto: consulta de disponibilidade no Supabase sem erros CORS/JavaScript, reserva real para 10/11/2026 às 10:00 e bloqueio no calendário após a reserva.
3. Mesmo navegador: cancelamento confirmado com código e estado 'Cancelado'.
4. Banco após o teste: nenhuma reserva ativa; um registro de teste cancelado.
5. WebsitePublisher sincronizado byte a byte com `index.html` do GitHub (versão 7 após correções de interface).
6. Advisories Supabase: nenhum alerta de desempenho ou saúde. Informativo de RLS sem política na tabela é intencional: sem acesso direto público.

## Guia para verificar antes de apresentar ao cliente
- Em dois celulares/navegadores, selecionar um serviço e confirmar horários disponíveis.
- Fazer UMA reserva de teste em data futura, verificar que o horário some do segundo dispositivo, cancelar no primeiro e verificar que volta.
- Conferir se o WhatsApp abre com o número correto e com serviço, data, hora e código. Não precisa enviar a mensagem de teste.
- Conferir datas e horários de sábado; testar também o combo de 70 minutos perto do encerramento.
- Confirmar com o cliente os preços e as durações dos cinco serviços marcados como estimados.
- Garantir que o cliente entenda que o sistema funciona por link web e que avisos são manuais pelo WhatsApp.

## Pendências para uma versão comercial completa
- Painel administrativo com login do proprietário e acesso centralizado à agenda.
- Notificação automática com provedor oficial, se desejada.
- Verificação de telefone, proteção antispam, limites/rate limiting e medidas antiabuso.
- Exportação/backup periódico e monitoramento de erros.
- Política de privacidade, documentação LGPD e contrato de serviço.
- Domínio próprio e análise de branding/rodapé da hospedagem gratuita.

**Atenção:** Não modificar diretamente no Lovable. Atualizar e verificar o GitHub `main` e só depois sincronizar WebsitePublisher. Preservar o código funcional e não adicionar chaves `service_role` ou `sb_secret_...` ao frontend.
