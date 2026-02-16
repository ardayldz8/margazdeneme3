// API_URL boş = Netlify proxy kullanılır (/api/* -> Lightsail)
// Local dev için VITE_API_URL yoksa localhost kullan.
const ENV_API_URL = import.meta.env.VITE_API_URL as string | undefined;
export const API_URL = ENV_API_URL || (import.meta.env.DEV ? 'http://localhost:3000' : '');
