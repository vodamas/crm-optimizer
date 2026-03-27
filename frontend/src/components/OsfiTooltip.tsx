import { useState, useRef, useEffect } from 'react';
import { OSFI_REFS } from '../data/osfiReferences';

interface Props {
  refKey: string;
}

export function OsfiTooltip({ refKey }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const data = OSFI_REFS[refKey];

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  if (!data) return null;

  return (
    <span className="osfi-tooltip-wrap" ref={ref}>
      <button
        className="osfi-tooltip-trigger"
        onClick={() => setOpen(!open)}
        title={`OSFI CAR ${data.chapter} ${data.sections}`}
      >
        ?
      </button>
      {open && (
        <div className="osfi-tooltip-popup">
          <div className="osfi-tooltip-header">{data.chapter} {data.sections}</div>
          <div className="osfi-tooltip-title">{data.title}</div>
          <div className="osfi-tooltip-body">{data.summary}</div>
          <div className="osfi-tooltip-footer">OSFI Capital Adequacy Requirements (CAR) 2026</div>
        </div>
      )}
    </span>
  );
}
