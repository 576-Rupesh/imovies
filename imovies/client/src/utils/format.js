import { API_ORIGIN } from '../api/client';

export const money = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;
export const fmtDate = (d) =>
  new Date(d).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
export const fmtTime = (d) =>
  new Date(d).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true });
export const fmtDateTime = (d) => `${fmtDate(d)}, ${fmtTime(d)}`;
export const dayKey = (d) => {
  const x = new Date(d);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
};
export const runtime = (m) => `${Math.floor(m / 60)}h ${m % 60}m`;
export const mediaUrl = (p) => (!p ? '' : p.startsWith('http') ? p : `${API_ORIGIN}${p}`);
