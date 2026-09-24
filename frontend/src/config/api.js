const configuredApiUrl = import.meta.env.VITE_API_URL;

export const API_URL = (configuredApiUrl || (import.meta.env.DEV ? 'http://localhost:5000' : window.location.origin)).replace(/\/$/, '');