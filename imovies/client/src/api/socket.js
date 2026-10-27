import { io } from 'socket.io-client';

// In dev the API runs on :5000; in production set VITE_API_URL (or serve client from the API).
const url = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:5000' : window.location.origin);
export const socket = io(url, { autoConnect: false });
