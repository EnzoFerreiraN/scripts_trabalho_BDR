# DESIGN — Sistema visual do painel

Tema: **broadsheet cívico claro** — papel claro, tinta quase preta, um índigo de
ação, dados num espectro categórico medido. A "voz" vem do accent + tipografia,
não do fundo. Fonte única da verdade: `front-end/src/styles/global.css` (`:root`).

## Cores (OKLCH, tokens em :root)
| Token | Valor | Uso |
|---|---|---|
| `--paper` | `oklch(0.976 0.003 280)` | bg da página (cinza-frio levíssimo) |
| `--surface` | `oklch(1 0 0)` | cards (branco puro) |
| `--surface-2` | `oklch(0.961 0.004 280)` | thead, insets, chips |
| `--border` / `--border-strong` | `0.905` / `0.85` 280 | bordas |
| `--ink` | `oklch(0.24 0.012 280)` | texto primário (~13:1) |
| `--muted` | `oklch(0.46 0.02 280)` | texto secundário (≥4.5:1 no branco) |
| `--accent` | `oklch(0.50 0.19 279)` | ações, aba ativa, foco |
| `--accent-strong` | `oklch(0.43 0.18 279)` | texto/link accent em branco |
| `--accent-soft` | `oklch(0.95 0.03 279)` | tints (hover de linha, badge azul) |
| `--green/red/amber` (+`-strong`) | — | semânticas recalibradas p/ fundo claro |
| `--gold/silver/bronze` | — | medalhas de ranking/pódio |

Cores de gráfico vivem em `front-end/src/lib/chartDefaults.js` (`PALETTE`,
`VOTE_COLORS`, `tickColor`, `legendColor`, `gridColor`, `wordcloudBg`), tunadas
para fundo claro. **Não** colocar literais de cor nos componentes — importar daqui.

## Tipografia (eixo serifa + sans; ≤3 famílias)
- **Display/títulos:** `Source Serif 4` (`--serif`) — section titles, h1.
- **UI/corpo/dados:** `Inter` (`--sans`).
- **Números:** `JetBrains Mono` (`--mono`) + `tabular-nums` em `.stat .val`,
  valores de pódio/card e células numéricas (alinhamento). Fontes via `<link>` em
  `front-end/index.html`.
- `.card h3` é sentence case, peso 600 — **sem** uppercase/letter-spacing (evita o
  "eyebrow" repetido).

## Componentes-chave (`front-end/src/components/shared/`)
- `DataTable` — tabela com ordenação por coluna (asc/desc/limpar) + busca opcional;
  `onRowClick` torna linhas clicáveis e acessíveis por teclado.
- `Skeleton` (`TabSkeleton`) — placeholder de carga inicial (respeita reduced-motion).
- `EmptyState` / `ErrorBox` — estados vazio e de erro, sempre visíveis.
- `Avatar`, `Badge`, `RankNum`, `InfoCard`, `LoadingSpinner`.

## Motion
- 140–220ms ease-out em hover/foco/aba; stagger leve (≤5) na entrada dos
  `deputy-cards`. `@media (prefers-reduced-motion: reduce)` neutraliza tudo.

## Acessibilidade
- Foco visível global (`:focus-visible`). Cards/linhas clicáveis têm
  `role="button"`, `tabIndex`, Enter/Espaço. Modal: `role="dialog"`,
  `aria-modal`, foco ao abrir, fecha no `Esc`. Contraste de corpo ≥4.5:1.

## Banimentos respeitados
Sem borda lateral colorida (side-stripe), sem gradient-text, sem eyebrow uppercase
por seção, sem glassmorphism decorativo. Detector do skill: 0 achados.
