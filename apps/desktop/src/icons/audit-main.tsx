import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { LucideProvider } from 'lucide-react';
import manifest from './manifest.json';
import { customIcons, type CustomIconName } from './custom-icons.generated';
import './icon-audit.css';

function IconAudit() {
  return <main className="icon-audit" data-testid="icon-audit">
    <header>
      <div><strong>Courtwork</strong><span>P-4 · SVG-as-code</span></div>
      <h1>领域图标 16px / 24px 可辨性审计</h1>
      <p>17 个概念 · 19 个具名变体 · 24×24 网格 · 1.35px currentColor</p>
    </header>
    <section className="icon-audit-grid" aria-label="自绘图标清单">
      {manifest.map((entry) => {
        const Component = customIcons[entry.name as CustomIconName];
        return <article className="icon-audit-card" data-icon-name={entry.name} key={entry.name}>
          <div className="icon-audit-title"><strong>{entry.concept}</strong><code>{entry.name}</code></div>
          <div className="icon-audit-sizes">
            <figure className="size-16"><span><Component size={16} /></span><figcaption>16</figcaption></figure>
            <figure className="size-24"><span><Component size={24} /></span><figcaption>24</figcaption></figure>
          </div>
          <small>{entry.family}</small>
        </article>;
      })}
    </section>
  </main>;
}

createRoot(document.getElementById('icon-audit-root')!).render(
  <StrictMode>
    <LucideProvider strokeWidth={1.35}>
      <IconAudit />
    </LucideProvider>
  </StrictMode>,
);
