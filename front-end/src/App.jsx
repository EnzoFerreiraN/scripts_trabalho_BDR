import { useState } from 'react';
import Q1Tab from './components/Q1/Q1Tab';
import Q2Tab from './components/Q2/Q2Tab';
import Q3Tab from './components/Q3/Q3Tab';
import Q4Tab from './components/Q4/Q4Tab';
import Q5Tab from './components/Q5/Q5Tab';
import Q6Tab from './components/Q6/Q6Tab';
import Q7Tab from './components/Q7/Q7Tab';

const TABS = [
  { id: 'q1', label: 'Deputados com mais gastos' },
  { id: 'q2', label: 'Eixos de atuação' },
  { id: 'q3', label: 'Padrão de votação' },
  { id: 'q4', label: 'Escolaridade' },
  { id: 'q5', label: 'Principais fornecedores' },
  { id: 'q6', label: 'Escolaridade & comportamento' },
  { id: 'q7', label: 'Influência parlamentar' },
];

const TAB_COMPONENTS = { q1: Q1Tab, q2: Q2Tab, q3: Q3Tab, q4: Q4Tab, q5: Q5Tab, q6: Q6Tab, q7: Q7Tab };

export default function App() {
  const [activeTab, setActiveTab] = useState('q1');
  const [loaded, setLoaded] = useState(new Set(['q1']));

  function showTab(id) {
    setActiveTab(id);
    setLoaded(prev => new Set(prev).add(id));
  }

  return (
    <>
      <header>
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
          <rect width="28" height="28" rx="6" fill="#4f8ef7" opacity=".15"/>
          <path d="M14 4L24 10V18L14 24L4 18V10L14 4Z" stroke="#4f8ef7" strokeWidth="1.5" fill="none"/>
          <circle cx="14" cy="14" r="3" fill="#4f8ef7"/>
        </svg>
        <div>
          <h1>Câmara dos Deputados</h1>
          <span>Dashboard de Análise — BDR Grupo 7 · 2023–2026</span>
        </div>
      </header>

      <nav>
        {TABS.map(tab => (
          <button
            key={tab.id}
            className={activeTab === tab.id ? 'active' : ''}
            onClick={() => showTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      <main>
        {TABS.map(tab => {
          const Component = TAB_COMPONENTS[tab.id];
          return (
            <div key={tab.id} style={{ display: activeTab === tab.id ? 'block' : 'none' }}>
              {loaded.has(tab.id) && <Component />}
            </div>
          );
        })}
      </main>
    </>
  );
}
