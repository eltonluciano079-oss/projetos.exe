import {services, barbers} from './data.mjs';
import {escapeHtml, money, normalize, serviceCard} from './render.mjs';
import {initMotion} from './motion.mjs';
var state={view:'home',step:0,service:'',barber:'',date:'',time:'',payment:'pix',filter:'Todos',search:'',detail:''};
var $=function(id){return document.getElementById(id)};
var selectedService=function(){return services.find(function(s){return s.id===state.service})};
var selectedBarber=function(){return barbers.find(function(b){return b.id===state.barber})};
let cachedAppointments;
const appointmentKey = 'wm-appointments';
function appointments() {
  if (!cachedAppointments) {
    try {
      const value = JSON.parse(localStorage.getItem(appointmentKey) || '[]');
      cachedAppointments = Array.isArray(value) ? value.filter(a => a && typeof a === 'object' && typeof a.id === 'string' && typeof a.date === 'string') : [];
    } catch { cachedAppointments = []; }
  }
  // Callers edit a copy; failed writes must not update the cached record.
  return cachedAppointments.map(a => ({...a}));
}
function saveAppointments(list) {
  localStorage.setItem(appointmentKey, JSON.stringify(list));
  cachedAppointments = list;
}
window.addEventListener('storage', e => {
  if (e.key === appointmentKey || e.key === null) {
    cachedAppointments = undefined;
    if (state.view === 'appointments') renderAppointments();
  }
});
function setHTML(id, html) {
  const el = $(id);
  if (el._html === html) return;
  el.innerHTML = html;
  el._html = html;
}
function selectChoice(container, attribute, value) {
  $(container).querySelectorAll('[' + attribute + ']').forEach(button => {
    const selected = button.getAttribute(attribute) === value;
    button.classList.toggle('selected', selected);
    button.setAttribute('aria-pressed', String(selected));
  });
}

function toast(message){var el=$('toast');el.textContent=message;el.classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(function(){el.classList.remove('show')},2600)}
function nav(view){if(!$('view-'+view))return;state.view=view;document.querySelectorAll('.view').forEach(function(el){el.classList.toggle('active',el.id==='view-'+view)});document.querySelectorAll('[data-nav]').forEach(function(el){el.classList.toggle('active',el.getAttribute('data-nav')===view)});window.scrollTo({top:0,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});if(view==='explore')renderExplore();if(view==='appointments')renderAppointments();if(view==='booking')renderBooking();if(view==='barber')renderBarberDetail()}
let lastSearch = '';
function renderExplore() {
  const query = normalize(state.search);
  if (query === lastSearch) return;
  lastSearch = query;
  const filtered = services.filter(s => normalize(s.name + ' ' + s.description).includes(query));
  setHTML('service-catalog', filtered.map(s => serviceCard(s)).join(''));
  $('search-status').textContent = filtered.length ? filtered.length + ' serviços encontrados.' : 'Nenhum serviço encontrado.';
}
function renderBarberDetail(){var b=barbers.find(function(x){return x.id===state.detail})||barbers[0];$('barber-detail').innerHTML='<div class="profile-card"><div class="barber-avatar" style="width:76px;height:76px;font-size:26px">'+b.initials+'</div><div class="eyebrow" style="margin-top:20px">ATENDIMENTO WM</div><h1 class="page-title">'+escapeHtml(b.name)+'</h1><p class="page-subtitle">'+escapeHtml(b.specialty)+'</p><p style="color:var(--muted);margin-top:18px">'+escapeHtml(b.bio)+'</p><div class="profile-row"><span>Equipe</span><strong>Barbearia WM</strong></div><div class="profile-row"><span>Especialidade</span><strong>'+escapeHtml(b.specialty)+'</strong></div><div class="detail-actions"><button class="btn" data-book-barber="'+b.id+'">Agendar com este profissional ↗</button></div></div>'}
function renderBooking(){
document.querySelectorAll('.booking-step').forEach(function(el){el.classList.toggle('active',Number(el.dataset.step)===state.step)});
document.querySelectorAll('.step').forEach(function(el,i){el.classList.toggle('active',i===state.step);el.classList.toggle('done',i<state.step)});
$('booking-back').disabled=state.step===0;$('booking-next').textContent=state.step===3?'Enviar solicitação ↗':'Continuar ↗';
if(!state.barber)state.barber='wm';
if(state.step===0){
  setHTML('service-choices', services.map(s => '<button class="choice" data-pick-service="'+s.id+'"><span><strong>'+escapeHtml(s.name)+'</strong><small>'+escapeHtml(s.duration)+' · '+escapeHtml(s.description)+'</small></span><span class="price">'+money(s.price)+'</span><span class="radio"></span></button>').join(''));
  selectChoice('service-choices','data-pick-service',state.service);
}
if(state.step===1)setHTML('barber-choices','<div class="choice selected"><span><strong>Profissional WM</strong><small>Atendimento da Barbearia WM</small></span><span class="radio"></span></div>');
if(state.step===2){renderDates();renderTimes();}
if(state.step===3){
  setHTML('payment-choices',[{id:'pix',name:'Pix',desc:'Preferência de pagamento via Pix'},{id:'onsite',name:'Pagar na barbearia',desc:'Pix ou cartão diretamente no local'}].map(p => '<button class="choice" data-pick-payment="'+p.id+'"><span><strong>'+p.name+'</strong><small>'+p.desc+'</small></span><span class="radio"></span></button>').join(''));
  selectChoice('payment-choices','data-pick-payment',state.payment);
  renderSummary();
}
}

function dateOptions(){const dates=[];const day=new Date();while(dates.length<5){day.setDate(day.getDate()+1);if(day.getDay()!==0&&day.getDay()!==1)dates.push(new Date(day));}return dates;}
function dateKey(d){return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')}
function renderDates(){
 const dates=dateOptions();
 if(!dates.some(d=>dateKey(d)===state.date))state.date=dateKey(dates[0]);
 setHTML('date-choices',dates.map(d=>'<button class="date-choice" data-date="'+dateKey(d)+'"><small>'+d.toLocaleDateString('pt-BR',{weekday:'short'}).replace('.','')+'</small><strong>'+d.getDate()+'</strong><small>'+d.toLocaleDateString('pt-BR',{month:'short'}).replace('.','')+'</small></button>').join(''));
 selectChoice('date-choices','data-date',state.date);
}
function renderTimes(){
 const saturday=state.date&&new Date(state.date+'T12:00:00').getDay()===6;
 const times=['09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:00','19:00'];
 if(saturday)times.push('20:00','21:00');
 if(!times.includes(state.time))state.time='10:00';
 setHTML('time-choices',times.map(t=>'<button class="time-choice" data-time="'+t+'">'+t+'</button>').join(''));
 selectChoice('time-choices','data-time',state.time);
}
function renderSummary(){var s=selectedService(),b=selectedBarber();var date=state.date?new Date(state.date+'T12:00:00').toLocaleDateString('pt-BR',{weekday:'short',day:'2-digit',month:'long'}):'—';$('booking-summary').innerHTML='<div class="summary-row"><span>Serviço</span><strong>'+(s?escapeHtml(s.name):'—')+'</strong></div><div class="summary-row"><span>Profissional</span><strong>'+(b?escapeHtml(b.name):'—')+'</strong></div><div class="summary-row"><span>Data e horário</span><strong>'+date+' · '+(state.time||'—')+'</strong></div><div class="summary-row"><span>Pagamento</span><strong>'+({pix:'Pix',card:'Cartão',onsite:'Na barbearia'}[state.payment])+'</strong></div><div class="summary-row total"><span>Valor estimado</span><strong>'+(s?money(s.price):'—')+'</strong></div>'}
function validateStep(){if(state.step===0&&!state.service){toast('Selecione um serviço para continuar.');return false}if(state.step===1&&!state.barber){toast('Escolha um profissional.');return false}if(state.step===2&&(!state.date||!state.time)){toast('Escolha uma data e um horário.');return false}return true}
function submitBooking(){var s=selectedService(),b=selectedBarber();if(!s||!b){toast('Revise os dados do agendamento.');return}var record={id:'WM-'+(globalThis.crypto?.randomUUID?.()||Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,10)),service:s.name,barber:b.name,date:state.date,time:state.time,payment:state.payment,total:s.price,status:'Aguardando confirmação',createdAt:new Date().toISOString()};var list=appointments();list.unshift(record);historyPage=0;try{saveAppointments(list)}catch(e){toast('Não foi possível salvar neste dispositivo.');return}$('booking-next').disabled=false;state.step=0;state.service='';state.barber='';state.time='';nav('appointments');toast('Solicitação registrada neste dispositivo. A equipe precisa confirmar pelo WhatsApp.')}
let historyModule;
let historyLoading;
let historyRetry=0;
let historyPage=0;
let historyRequest=0;
async function renderAppointments(focusPage=false){
 const request=++historyRequest;
 const container=$('appointments-content');
 if(!historyModule){
  container.setAttribute('aria-busy','true');
  container.innerHTML='<div role="status" class="loading-status">Carregando agendamentos…</div><div class="skeleton-card" aria-hidden="true"></div><div class="skeleton-card" aria-hidden="true"></div>';
  let timeout;
  try{
   historyLoading ||= import('./history.mjs' + (historyRetry ? '?retry='+historyRetry : ''));
   historyModule=await Promise.race([historyLoading,new Promise((_,reject)=>{timeout=setTimeout(()=>reject(new Error('timeout')),12000);})]);
  }catch{
   if(request===historyRequest){
    historyLoading=undefined;
    historyRetry++;
    container.removeAttribute('aria-busy');
    container.innerHTML='<div role="alert" class="empty-state"><strong>Não foi possível carregar seus agendamentos.</strong>Verifique sua conexão e tente novamente.<p><button class="btn" data-retry-history>Tentar novamente</button></p></div>';
   }
   return;
  }finally{clearTimeout(timeout);}
 }
 if(request!==historyRequest||state.view!=='appointments')return;
 container.removeAttribute('aria-busy');
 historyPage=historyModule.renderHistory(container,appointments(),historyPage);
 if(focusPage){const status=$('history-page-status');status?.focus();}
}
document.addEventListener('click',function(e){
var retry=e.target.closest('[data-retry-history]');if(retry){renderAppointments();return;}
var page=e.target.closest('[data-history-page]');if(page){historyPage=Number(page.dataset.historyPage);renderAppointments(true);return;}

var cancel=e.target.closest('[data-cancel-appointment]');if(cancel){var id=cancel.getAttribute('data-cancel-appointment');if(!window.confirm('Cancelar esta solicitação de agendamento? Esta ação altera somente o registro salvo neste navegador.'))return;var list=appointments();var found=list.find(function(a){return a.id===id});if(!found||found.status==='Cancelado')return;found.status='Cancelado';try{saveAppointments(list)}catch(err){toast('Não foi possível cancelar neste dispositivo.');return}renderAppointments();toast('Solicitação cancelada neste dispositivo. Avise a barbearia pelo WhatsApp se já tiver enviado o pedido.');return}
var navEl=e.target.closest('[data-nav]');if(navEl){e.preventDefault();nav(navEl.getAttribute('data-nav'));return}
var action=e.target.closest('[data-action]');if(action&&action.dataset.action==='start-booking'){state.step=0;nav('booking');return}
var service=e.target.closest('[data-service]');if(service){state.service=service.dataset.service;state.step=0;nav('booking');return}
var pickS=e.target.closest('[data-pick-service]');if(pickS){state.service=pickS.dataset.pickService;renderBooking();return}
var pickB=e.target.closest('[data-pick-barber]');if(pickB){state.barber=pickB.dataset.pickBarber;renderBooking();return}
var pickP=e.target.closest('[data-pick-payment]');if(pickP){state.payment=pickP.dataset.pickPayment;renderBooking();return}
var date=e.target.closest('[data-date]');if(date){state.date=date.dataset.date;renderDates();renderTimes();return}
var time=e.target.closest('[data-time]');if(time){state.time=time.dataset.time;renderTimes();return}
var filter=e.target.closest('[data-filter]');if(filter){state.filter=filter.dataset.filter;renderExplore();return}
var detail=e.target.closest('[data-barber-detail]');if(detail){state.detail=detail.dataset.barberDetail;nav('barber');return}
var bookBarber=e.target.closest('[data-book-barber]');if(bookBarber){state.barber=bookBarber.dataset.bookBarber;state.step=0;nav('booking');return}
});
$('booking-next').addEventListener('click',function(){if(!validateStep())return;if(state.step<3){state.step++;renderBooking()}else submitBooking()});
$('booking-back').addEventListener('click',function(){if(state.step>0){state.step--;renderBooking()}});
let searchTimer;
$('service-search').addEventListener('input',function(e){
 clearTimeout(searchTimer);
 const value=e.target.value;
 searchTimer=setTimeout(()=>{state.search=value;renderExplore();},250);
});

initMotion();
