export const escapeHtml = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[c]));
const currency = new Intl.NumberFormat('pt-BR', {style: 'currency', currency: 'BRL'});
export const money = value => currency.format(Number(value));
export const normalize = value => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR').trim();

export function serviceCard(service, photo = '') {
  return `<button class="service-card" data-service="${service.id}" aria-label="Selecionar ${escapeHtml(service.name)}">${photo ? `<img class="service-photo" src="${photo}" alt="" width="640" height="640" loading="lazy" decoding="async"><span class="service-shade" aria-hidden="true"></span>` : ''}<span class="service-symbol">${service.icon}</span><h3>${escapeHtml(service.name)}</h3><p>${escapeHtml(service.duration)} · ${escapeHtml(service.description)}</p><span class="service-price">${money(service.price)}</span></button>`;
}
