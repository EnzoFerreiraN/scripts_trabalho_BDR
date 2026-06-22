import { useState, useEffect } from 'react';
import Q1Tab from './components/Q1/Q1Tab';
import Q2Tab from './components/Q2/Q2Tab';
import Q3Tab from './components/Q3/Q3Tab';
import Q4Tab from './components/Q4/Q4Tab';
import Q5Tab from './components/Q5/Q5Tab';
import Q6Tab from './components/Q6/Q6Tab';
import Q7Tab from './components/Q7/Q7Tab';
import Q8Tab from './components/Q8/Q8Tab';
import ErrorBoundary from './components/shared/ErrorBoundary';

const TAB_COMPONENTS = {
  q1: Q1Tab, q2: Q2Tab, q3: Q3Tab,
  q4: Q4Tab, q5: Q5Tab, q6: Q6Tab, q7: Q7Tab, q8: Q8Tab,
};

const DASHBOARDS = [
  {
    id: 'deputado',
    label: 'Visão Geral do Deputado',
    tabs: [
      { id: 'q8', label: 'Visão Geral do Deputado' },
    ],
  },
  {
    id: 'dinheiro',
    label: 'Gastos & Fornecedores',
    tabs: [
      { id: 'q1', label: 'Deputados com mais gastos' },
      { id: 'q5', label: 'Principais fornecedores' },
    ],
  },
  {
    id: 'atuacao',
    label: 'Atuação & Influência',
    tabs: [
      { id: 'q2', label: 'Eixos de atuação' },
      { id: 'q3', label: 'Padrão de votação' },
      { id: 'q7', label: 'Influência parlamentar' },
    ],
  },
  {
    id: 'perfil',
    label: 'Escolaridade & Perfil',
    tabs: [
      { id: 'q4', label: 'Escolaridade' },
      { id: 'q6', label: 'Correlações' },
    ],
  },
];

// All component ids in natural render order
const ALL_TAB_IDS = DASHBOARDS.flatMap(d => d.tabs.map(t => t.id));

// Reverse map: tabId -> dashId
const TAB_TO_DASH = {};
DASHBOARDS.forEach(d => d.tabs.forEach(t => { TAB_TO_DASH[t.id] = d.id; }));

// Parse "#dinheiro-q1" → { dashId, tabId }. Falls back to first tab.
// Also handles legacy hashes like "#q1".
function parseHash() {
  const h = window.location.hash.replace('#', '');
  const [head, tail] = [h.split('-')[0], h.split('-').slice(1).join('-')];
  const dash = DASHBOARDS.find(d => d.id === head);
  if (dash) {
    const tab = dash.tabs.find(t => t.id === tail);
    if (tab) return { dashId: head, tabId: tail };
    return { dashId: head, tabId: dash.tabs[0].id };
  }
  // Legacy: "#q1" style
  if (h && TAB_TO_DASH[h]) {
    return { dashId: TAB_TO_DASH[h], tabId: h };
  }
  return { dashId: DASHBOARDS[0].id, tabId: DASHBOARDS[0].tabs[0].id };
}

export default function App() {
  const [{ dashId, tabId }, setActive] = useState(parseHash);
  const [loaded, setLoaded] = useState(() => new Set([parseHash().tabId]));

  // Sync with browser back/forward.
  useEffect(() => {
    function onHashChange() {
      const next = parseHash();
      setActive(next);
      setLoaded(prev => new Set(prev).add(next.tabId));
    }
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  function showTab(dId, tId) {
    const hash = `${dId}-${tId}`;
    if (window.location.hash !== `#${hash}`) window.location.hash = hash;
    setActive({ dashId: dId, tabId: tId });
    setLoaded(prev => new Set(prev).add(tId));
  }

  const activeDash = DASHBOARDS.find(d => d.id === dashId) ?? DASHBOARDS[0];

  return (
    <>
      <header>
        <svg className="brand-mark" width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
          <rect width="28" height="28" rx="6" fill="currentColor" opacity=".12" />
          <path d="M14 4L24 10V18L14 24L4 18V10L14 4Z" stroke="currentColor" strokeWidth="1.5" fill="none" />
          <circle cx="14" cy="14" r="3" fill="currentColor" />
        </svg>
        <div>
          <h1>Câmara dos Deputados</h1>
          <span>Painel de análise — 2023-2026</span>
        </div>
      </header>

      {/* Primary nav: 3 dashboards */}
      <nav aria-label="Dashboards de análise">
        {DASHBOARDS.map(dash => (
          <button
            key={dash.id}
            className={dashId === dash.id ? 'active' : ''}
            aria-current={dashId === dash.id ? 'page' : undefined}
            onClick={() => showTab(dash.id, dash.tabs[0].id)}
          >
            {dash.label}
          </button>
        ))}
      </nav>

      <main>
        {/* Secondary nav: tabs within the active dashboard */}
        <div className="sub-nav" role="tablist" aria-label="Seções do dashboard">
          {activeDash.tabs.map(tab => (
            <button
              key={tab.id}
              role="tab"
              className={tabId === tab.id ? 'active' : ''}
              aria-selected={tabId === tab.id}
              onClick={() => showTab(activeDash.id, tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Mount all tab components lazily; hide inactive ones to preserve state */}
        {ALL_TAB_IDS.map(tid => {
          const Component = TAB_COMPONENTS[tid];
          return (
            <div key={tid} style={{ display: tabId === tid ? 'block' : 'none' }}>
              {loaded.has(tid) && (
                <ErrorBoundary>
                  <Component />
                </ErrorBoundary>
              )}
            </div>
          );
        })}
      </main>
    </>
  );
}
