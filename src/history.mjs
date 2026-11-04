import {escapeHtml, money} from './render.mjs';

const PAGE_SIZE = 20;
const dateFormat = new Intl.DateTimeFormat('pt-BR', {day:'2-digit', month:'long', year:'numeric'});
export function renderHistory(container, list, requestedPage) {
  const pages = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
  const page = Math.min(Math.max(0, requestedPage), pages - 1);
  const start = page * PAGE_SIZE;
  if (!list.length) {
    container.innerHTML = '<div class="empty-state"><strong>Sua agenda está livre.</strong>Quando você solicitar um horário, ele aparecerá aqui.<p><button class="btn" data-nav="booking">Agendar agora</button></p></div>';
    return page;
  }
  container.innerHTML = '<div class="appointments-list">' + list.slice(start, start + PAGE_SIZE).map(a => {
    const date = new Date(a.date + 'T12:00:00');
    const label = Number.isNaN(date.getTime()) ? 'Data a confirmar' : dateFormat.format(date);
    const payment = {pix:'Pix', card:'Cartão', onsite:'Na barbearia'}[a.payment] || a.payment;
    const message = `Olá! Gostaria de confirmar a disponibilidade para ${a.service} na WM, em ${label} às ${a.time}. Código: ${a.id}.`;
    return `<article class="appointment-card"><div><h3>${escapeHtml(a.service)}</h3><p>${escapeHtml(a.barber)}<br>${escapeHtml(label)} · ${escapeHtml(a.time)}<br>${money(a.total)} · ${escapeHtml(payment)}</p><p style="margin-top:9px">Código: ${escapeHtml(a.id)}</p></div><div class="appointment-controls"><span class="status">${escapeHtml(a.status)}</span>${a.status === 'Cancelado' ? '' : `<a class="confirm-whatsapp" href="https://wa.me/5511945876259?text=${escapeHtml(encodeURIComponent(message))}" target="_blank" rel="noopener noreferrer">Confirmar pelo WhatsApp</a><button type="button" class="cancel-appointment" data-cancel-appointment="${escapeHtml(a.id)}">Cancelar agendamento</button>`}</div></article>`;
  }).join('') + '</div>' + (pages > 1 ? `<nav class="history-pagination" aria-label="Páginas dos agendamentos"><button class="btn secondary" data-history-page="${page - 1}" ${page === 0 ? 'disabled' : ''}>Anterior</button><p role="status" tabindex="-1" id="history-page-status">${start + 1}–${Math.min(start + PAGE_SIZE, list.length)} de ${list.length}</p><button class="btn secondary" data-history-page="${page + 1}" ${page === pages - 1 ? 'disabled' : ''}>Próxima</button></nav>` : '') + '<p class="payment-note">Solicitações salvas neste navegador. A equipe WM ainda precisa confirmar a disponibilidade pelo WhatsApp.</p>';
  return page;
}
