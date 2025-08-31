Design brief — Concursando (Modern)

Paleta sugerida (opção A - Tech Calm):
- Indigo-Teal Gradient (primary): #4F46E5 -> #06B6D4
- Background: soft blue #f6fbff
- Surface: white #ffffff
- Muted text: #6b7280
- Success: #10b981
- Danger: #ef4444

Efeito psicológico: transmite confiança (indigo), modernidade e dinamismo (teal), sensação de calma e foco (fundo suave). Bom para plataformas educacionais modernas.

Paleta sugerida (opção B - Warm Focus):
- Primary: Deep Purple #5B21B6
- Accent: Orange #FB923C
- Background: warm gray #faf7f5
- Surface: off-white #fffdfc
- Muted: #6b5e5e

Efeito psicológico: sensação de energia equilibrada (laranja) com credibilidade e seriedade (roxo). Mais enérgico e estimulante.

Tipografia:
- Títulos: Inter Bold (700)
- Corpo: Inter Regular (400)
- Tamanho base: 16px; line-height 1.45

Acessibilidade:
- Contraste mínimo 4.5:1 para texto normal
- Focar no uso de semantic HTML, aria-labels e focus-visible styles

Componentização (React suggested):
- Header (Logo, Nav, ThemeToggle)
- Hero
- FeatureCard
- ThemeList (table) + ThemeRow
- QuizView (QuestionCard, OptionsList)
- Dashboard (ProgressCard, HistoryList)

Microinteractions:
- Smooth fade-in (200ms) for content cards
- Subtle scale on button hover (1.03)
- Success/Failure animations on answers (small confetti for success optional)

Integration notes:
- Backend endpoints remain the same; JS should keep calling `${API_URL}/...` as today.
- For migration to React/Tailwind, keep CSS variables and convert to Tailwind tokens for dark mode support.
