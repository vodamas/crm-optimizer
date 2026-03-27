import { useState } from 'react';

interface Props {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

export function CollapsibleSection({ title, defaultOpen = true, children }: Props) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="collapsible-section">
      <button className="collapsible-header" onClick={() => setOpen(!open)}>
        <span className={`collapsible-chevron ${open ? 'open' : ''}`}>&#9654;</span>
        <span className="collapsible-title">{title}</span>
      </button>
      {open && <div className="collapsible-body">{children}</div>}
    </div>
  );
}
