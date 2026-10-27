import { useEffect, useState } from 'react';

// Counts down to `until` (ISO string or Date) and calls onExpire once.
export default function Countdown({ until, onExpire }) {
  const calc = () => Math.max(0, Math.floor((new Date(until).getTime() - Date.now()) / 1000));
  const [left, setLeft] = useState(calc);

  useEffect(() => {
    setLeft(calc());
    const t = setInterval(() => {
      const s = calc();
      setLeft(s);
      if (s <= 0) { clearInterval(t); onExpire?.(); }
    }, 1000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [until]);

  const mm = String(Math.floor(left / 60)).padStart(2, '0');
  const ss = String(left % 60).padStart(2, '0');
  return <span className="timer" aria-live="off">{mm}:{ss}</span>;
}
