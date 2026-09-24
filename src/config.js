// Room/ledger server address: CI injects the deployed URL; `npm run dev` uses the local one.
export const SERVER_HTTP = (import.meta.env.VITE_SERVER_URL || (import.meta.env.DEV ? "http://localhost:8787" : "")).replace(/\/$/, "");
