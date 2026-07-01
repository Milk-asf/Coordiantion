/** Inline fallback styles when the dev CSS bundle is missing (e.g. after a local build). */
export const criticalStyles = `
  *, *::before, *::after { box-sizing: border-box; }
  html { font-family: system-ui, sans-serif; -webkit-text-size-adjust: 100%; }
  body { margin: 0; color: #1a1a1a; background: #fff; line-height: 1.5; }
  a { color: inherit; text-decoration: none; }
  ul, ol { list-style: none; margin: 0; padding: 0; }
  button { font: inherit; color: inherit; cursor: pointer; }
  .dashboard-shell { display: flex; flex-direction: column; height: 100vh; overflow: hidden; }
  .dashboard-main { flex: 1 1 auto; min-height: 0; overflow-y: auto; background: #fff; }
  .folk-sidebar-surface {
    display: flex;
    flex-direction: column;
    height: 100%;
    background: #fff;
    border-right: 1px solid #d9d9d9;
  }
  .folk-sidebar-surface > nav { flex: 1 1 auto; min-height: 0; overflow-y: auto; }
  .folk-sidebar-surface .folk-sidebar-footer { flex-shrink: 0; border-top: 1px solid #d9d9d9; }
  .folk-sidebar-surface button.folk-sidebar-nav-item {
    appearance: none;
    -webkit-appearance: none;
    background: transparent;
    border: none;
    text-align: left;
    width: 100%;
  }
  .folk-sidebar-surface a {
    display: flex;
    align-items: center;
    gap: 8px;
    min-height: 32px;
    padding: 0 12px;
    margin: 0 4px;
    border-radius: 4px;
    font-size: 12px;
    color: #616161;
    text-decoration: none;
  }
  @media (min-width: 768px) {
    .dashboard-shell { flex-direction: row; }
    .dashboard-sidebar-wrap { display: flex; }
    .dashboard-mobile-header { display: none !important; }
  }
  @media (max-width: 767px) {
    .dashboard-sidebar-wrap { display: none !important; }
  }
  .group\\/cell:hover [data-roster-add-shift],
  .group\\/cell:focus-within [data-roster-add-shift] {
    opacity: 1;
    pointer-events: auto;
  }
`
