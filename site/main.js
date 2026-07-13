const rows = [...document.querySelectorAll('.line-ledger li')];

if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches && 'IntersectionObserver' in window) {
  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      const index = rows.indexOf(entry.target);
      window.setTimeout(() => entry.target.classList.add('is-lit'), index * 90);
      observer.unobserve(entry.target);
    }
  }, { threshold: 0.65 });
  rows.forEach((row) => observer.observe(row));
} else {
  rows.forEach((row) => row.classList.add('is-lit'));
}
