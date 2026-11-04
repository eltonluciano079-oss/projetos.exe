"""Run against `node scripts/build.mjs` + a local server; no app dependencies."""
import json
import os
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

BASE = os.environ.get('WM_TEST_URL', 'http://127.0.0.1:8766')
OUT = Path('artifacts')
OUT.mkdir(exist_ok=True)

def go(page, view):
    if view == 'appointments':
        go(page, 'booking')
        page.locator('#view-booking [data-nav="appointments"]').click()
    elif view == 'home':
        page.locator('.brand[data-nav="home"]').click()
    elif page.locator('.mobile-nav [data-nav="' + view + '"]').is_visible():
        page.locator('.mobile-nav [data-nav="' + view + '"]').click()
    else:
        go(page, 'home')
        if view == 'booking':
            page.locator('.hero-primary').click()
        else:
            page.locator('#view-home [data-nav="' + view + '"]').click()
    expect(page.locator('#view-' + view)).to_have_class('view active')

def record(i):
    return dict(id=f'WM-{i}', service='Corte masculino', barber='Profissional WM', date='2026-11-07', time='10:00', payment='pix', total=40, status='Aguardando confirmação')

def booking(page):
    go(page, 'booking')
    page.locator('[data-pick-service="cut"]').click()
    page.locator('#booking-next').click()
    page.locator('#booking-next').click()
    expect(page.locator('[data-date]')).to_have_count(5)
    assert page.locator('[data-date]').evaluate_all('(els) => els.every(el => ![0,1].includes(new Date(el.dataset.date+"T12:00:00").getDay()))')
    page.locator('[data-time="11:00"]').click()
    page.locator('#booking-next').click()
    expect(page.locator('#booking-summary')).to_contain_text('11:00')
    page.locator('#booking-next').click()

with sync_playwright() as p:
    browser = p.chromium.launch(executable_path='/usr/bin/chromium', headless=True, args=['--no-sandbox'])
    errors = []
    # Mobile slow network, CPU x4; capture layout, real requests and paint metrics.
    context = browser.new_context(viewport={'width':390,'height':844}, device_scale_factor=1, reduced_motion='reduce')
    page = context.new_page()
    page.on('pageerror', lambda e: errors.append(str(e)))
    cdp = context.new_cdp_session(page)
    cdp.send('Network.enable')
    cdp.send('Network.emulateNetworkConditions', {'offline':False,'latency':150,'downloadThroughput':200000,'uploadThroughput':93750,'connectionType':'cellular3g'})
    cdp.send('Emulation.setCPUThrottlingRate', {'rate':4})
    requests=[]
    page.on('request', lambda r: requests.append(r.url))
    page.add_init_script("""window.wmMetrics={lcp:0,cls:0};new PerformanceObserver(list=>{for(const e of list.getEntries())wmMetrics.lcp=e.startTime}).observe({type:'largest-contentful-paint',buffered:true});new PerformanceObserver(list=>{for(const e of list.getEntries())if(!e.hadRecentInput)wmMetrics.cls+=e.value}).observe({type:'layout-shift',buffered:true});""")
    page.goto(BASE, wait_until='networkidle')
    expect(page.locator('#home-services .service-card')).to_have_count(3)
    assert not any('/history.' in url for url in requests), 'History must load only when opened'
    assert all(url.startswith(BASE) for url in requests), requests
    assert not any('hero-1600.' in url for url in requests), 'Mobile should request only mobile hero'
    assert len([url for url in requests if 'hero-800.' in url]) == 1
    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
    metrics = page.evaluate('({...wmMetrics, paints:performance.getEntriesByType("paint").map(x=>({name:x.name,ms:x.startTime})), resources:performance.getEntriesByType("resource").map(x=>({name:new URL(x.name).pathname,bytes:x.encodedBodySize}))})')
    page.screenshot(path=str(OUT/'mobile-home.png'),full_page=True)
    cdp.send('Network.emulateNetworkConditions', {'offline':False,'latency':0,'downloadThroughput':-1,'uploadThroughput':-1})
    cdp.send('Emulation.setCPUThrottlingRate', {'rate':1})

    # Debounce, accent-insensitive matching, unchanged-query DOM stability.
    go(page,'explore')
    page.evaluate("window.searchMutations=0;new MutationObserver(()=>searchMutations++).observe(document.querySelector('#service-catalog'),{childList:true});")
    page.locator('#service-search').press_sequentially('hidratacao',delay=20)
    expect(page.locator('#service-catalog .service-card')).to_have_count(1)
    expect(page.locator('#service-catalog')).to_contain_text('Hidratação capilar')
    assert page.evaluate('searchMutations') == 1
    page.locator('#service-search').fill('HIDRATAÇÃO ')
    page.wait_for_timeout(350)
    assert page.evaluate('searchMutations') == 1
    page.locator('#service-search').fill('xyz')
    expect(page.locator('#search-status')).to_have_text('Nenhum serviço encontrado.')
    page.locator('#service-search').fill('')
    expect(page.locator('#service-catalog .service-card')).to_have_count(8)
    page.screenshot(path=str(OUT/'mobile-services.png'),full_page=True)

    # Selections retain the DOM node and keyboard focus.
    go(page,'booking')
    page.evaluate('window.choiceBefore=document.querySelector(\'[data-pick-service="cut"]\')')
    page.locator('[data-pick-service="cut"]').click()
    assert page.evaluate('choiceBefore===document.activeElement && choiceBefore.isConnected')
    booking(page)
    expect(page.locator('.appointment-card')).to_have_count(1)
    expect(page.locator('.appointment-card .status')).to_have_text('Aguardando confirmação')
    assert 'Agendamento%20confirmado' not in page.locator('.confirm-whatsapp').get_attribute('href')
    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
    page.screenshot(path=str(OUT/'mobile-history.png'),full_page=True)
    page.on('dialog',lambda d:d.accept())
    page.locator('[data-cancel-appointment]').click()
    expect(page.locator('.appointment-card .status')).to_have_text('Cancelado')
    page.reload(wait_until='networkidle');go(page,'appointments')
    expect(page.locator('.appointment-card .status')).to_have_text('Cancelado')

    # Cross-tab invalidation and bounded DOM for 1,003 records.
    other=context.new_page();other.goto(BASE,wait_until='networkidle')
    other.evaluate('(data)=>localStorage.setItem("wm-appointments",JSON.stringify(data))',[record(i) for i in range(1003)])
    expect(page.locator('.appointment-card')).to_have_count(20)
    expect(page.locator('#history-page-status')).to_have_text('1–20 de 1003')
    page.locator('[data-history-page="1"]').click()
    expect(page.locator('#history-page-status')).to_have_text('21–40 de 1003')
    assert page.locator('#history-page-status').evaluate('(el)=>el===document.activeElement')
    # Storage write failure leaves both the screen and cached state unchanged.
    page.evaluate('() => { window.originalSetItem=Storage.prototype.setItem;Storage.prototype.setItem=()=>{throw new DOMException("Full","QuotaExceededError")} }')
    page.locator('[data-cancel-appointment]').first.click()
    expect(page.locator('#toast')).to_contain_text('Não foi possível cancelar')
    expect(page.locator('.appointment-card .status').first).to_have_text('Aguardando confirmação')
    page.evaluate('() => { Storage.prototype.setItem=originalSetItem; }')
    go(page,'home');go(page,'appointments')
    expect(page.locator('.appointment-card .status').first).to_have_text('Aguardando confirmação')
    other.close()

    # Lazy-module loading failure and successful explicit retry.
    failure=browser.new_page(viewport={'width':390,'height':844},reduced_motion='reduce')
    failure.on('pageerror',lambda e:errors.append(str(e)))
    failure.route('**/history.*.mjs',lambda route:route.abort())
    failure.goto(BASE,wait_until='networkidle');go(failure,'appointments')
    expect(failure.locator('[data-retry-history]')).to_be_visible()
    failure.unroute('**/history.*.mjs')
    failure.locator('[data-retry-history]').click()
    expect(failure.locator('#appointments-content')).to_contain_text('Sua agenda está livre.')
    failure.close()

    # Actual loading state during a delayed import, without inserting artificial delays in the app.
    delayed=browser.new_page(reduced_motion='reduce')
    pending=[]
    delayed.route('**/history.*.mjs',lambda route:pending.append(route))
    delayed.goto(BASE,wait_until='networkidle');go(delayed,'appointments')
    expect(delayed.locator('.skeleton-card')).to_have_count(2)
    expect(delayed.locator('#appointments-content')).to_have_attribute('aria-busy','true')
    delayed.wait_for_timeout(50)
    for route in pending: route.continue_()
    expect(delayed.locator('.skeleton-card')).to_have_count(0)
    delayed.close()

    # Desktop and small-phone layouts, keyboard, reduced motion, no JavaScript.
    for width in [360,1440]:
        view=browser.new_page(viewport={'width':width,'height':900},reduced_motion='reduce')
        view.on('pageerror',lambda e:errors.append(str(e)))
        view.goto(BASE,wait_until='networkidle')
        for name in ['home','explore','booking','profile']:
            go(view,name)
            assert view.evaluate('document.documentElement.scrollWidth <= innerWidth'), (width,name)
        go(view,'home')
        view.screenshot(path=str(OUT/f'home-{width}.png'),full_page=True)
        view.close()
    static=browser.new_page(java_script_enabled=False)
    static.goto(BASE)
    expect(static.locator('#home-services .service-card')).to_have_count(3)
    expect(static.locator('noscript a')).to_be_visible()
    expect(static.locator('noscript a')).to_contain_text('WhatsApp')
    static.close()
    motion=browser.new_page(reduced_motion='no-preference')
    motion.on('pageerror',lambda e:errors.append(str(e)))
    motion.goto(BASE,wait_until='networkidle')
    motion.wait_for_timeout(1800)
    assert motion.locator('.hero-primary').evaluate('(el)=>Number(getComputedStyle(el).opacity)===1')
    motion.evaluate('window.motionMutations=0;new MutationObserver(list=>motionMutations+=list.length).observe(document.querySelector(".main"),{subtree:true,attributes:true,attributeFilter:["class"]})')
    motion.wait_for_timeout(500)
    assert motion.evaluate('motionMutations') == 0, 'Motion observer must settle when idle'
    motion.close()
    assert not errors, errors
    (OUT/'metrics.json').write_text(json.dumps(metrics,indent=2))
    print(json.dumps({'result':'PASS','scenarios':['slow mobile','debounced search','stable focus','booking','cancellation','persistence','1003 appointments','cross-tab cache','storage failure','module failure/retry','skeleton','360/390/1440 layouts','no JavaScript'],'pageErrors':errors,'metrics':metrics},ensure_ascii=False))
    browser.close()
