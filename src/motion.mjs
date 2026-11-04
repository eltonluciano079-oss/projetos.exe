// Observe new buttons and view changes, not the classes this animation changes.
export function initMotion() {
  if (!('IntersectionObserver' in window) || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const main = document.querySelector('.main');
  const selector = '.btn,.text-button,.service-card,.choice,.date-choice,.time-choice';
  const initialized = new WeakSet();
  const pending = new Set();
  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      entry.target.classList.remove('fx-pending');
      entry.target.classList.add('fx-run');
      observer.unobserve(entry.target);
      pending.delete(entry.target);
    }
  }, {threshold:.12, rootMargin:'0px 0px -12px 0px'});
  let scheduled = false;
  function scan() {
    scheduled = false;
    for (const node of pending) {
      if (!node.isConnected || !node.closest('.view.active')) {
        observer.unobserve(node);
        node.classList.remove('fx-pending');
        pending.delete(node);
      }
    }
    main.querySelectorAll('.view.active').forEach(view => {
      view.querySelectorAll(selector).forEach((node, index) => {
        if (!initialized.has(node)) {
          initialized.add(node);
          node.classList.add('fx-premium-button');
          node.style.setProperty('--i', String(index % 6));
        }
        if (!node.classList.contains('fx-run') && !pending.has(node)) {
          pending.add(node);
          node.classList.add('fx-pending');
          observer.observe(node);
        }
      });
    });
  }
  function schedule() {
    if (!scheduled) { scheduled = true; requestAnimationFrame(scan); }
  }
  new MutationObserver(schedule).observe(main, {childList:true, subtree:true});
  const views = new MutationObserver(schedule);
  main.querySelectorAll('.view').forEach(view => views.observe(view, {attributes:true, attributeFilter:['class']}));
  scan();
}
