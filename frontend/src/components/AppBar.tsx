interface Props {
  onEditPortfolio: () => void;
}

export function AppBar({ onEditPortfolio }: Props) {
  return (
    <header className="appbar">
      <div className="appbar-left">
        <span className="appbar-logo">CRM Allocation Optimizer</span>
      </div>
      <div className="appbar-right">
        <button className="btn-edit-portfolio" onClick={onEditPortfolio}>
          Edit Portfolio
        </button>
        <span className="osfi-badge">OSFI CAR 2026</span>
        <span className="osfi-badge badge-secondary">Basel III/IV</span>
      </div>
    </header>
  );
}
