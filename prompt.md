## CSS Techniques Used

- **CSS custom properties** (`:root` variables) for colors, spacing, transitions
- **CSS Grid** — `repeat(3, 1fr)` for summary cards, two-column `main-grid` for form and chart
- **Flexbox** — header, nav, cards, expense rows, buttons
- **`clamp()`** — responsive hero font size without media queries
- **`position: sticky`** — fixed header on scroll
- **`backdrop-filter: blur()`** — frosted glass effect on header
- **`animation: fadeIn`** — new expense items slide in on add
- **`:focus-visible`** — keyboard-only focus ring on delete button
- **`transition`** — smooth color/width changes on balance bar and inputs
- **CSS `!important`** — used on balance bar and card-value color overrides to ensure state classes always win
- **`clamp()` + `max-width`** — text stays readable on all screen sizes
- **Media queries** — two breakpoints: 860px (tablet), 560px (mobile)

## Bugs Fixed During Development

- **`script.js` missing** — HTML referenced the file but it did not exist; app was fully broken on load
- **`form-msg` class mismatch** — CSS used `.form-msg.success` but JS set `.form-msg--success`; error and success messages never showed color
- **`.expense-right` undefined** — delete button and amount had no flex layout; they stacked vertically
- **`.btn-delete` undefined** — delete button had no styles; it was invisible and unstyled
- **`.balance-bar--low` / `--critical` undefined** — progress bar never changed color on low balance
- **`.currency-status--*` undefined** — exchange rate status text had no color states
- **`balanceIcon` ID conflict** — two elements shared same id; JS only found the first one
- **Chart duplication** — creating a new `Chart()` without destroying the old one caused stacking on re-render; fixed with in-place `chart.data = ...` update
- **Number spinner on inputs** — default browser arrow buttons on `type="number"` removed with `-webkit-appearance: none` and `-moz-appearance: textfield`
- **XSS in expense names** — user input inserted via `innerHTML`; fixed with `esc()` helper escaping `& < > " '`
