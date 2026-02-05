# Margaz Dashboard (Frontend)

React + Vite tabanli Margaz Tank Telemetri dashboard uygulamasi.

## Ozellikler
- Mobil uyumlu dashboard ve bayi detaylari
- Tarih/saat araligi secilebilir telemetri grafikleri ve harita gorunumu
- Admin paneli (bayi/cihaz yonetimi, atama)
- JWT tabanli kimlik dogrulama

## Gereksinimler
- Node.js 18+
- npm

## Kurulum
```bash
npm install
```

## Calistirma
```bash
npm run dev
```

Varsayilan adres: http://localhost:5173

## Testler
```bash
npm test
npm run test:coverage
```

## Ortam Degiskenleri
Netlify uzerinden asagidakiler set edilir:

```
BACKEND_URL=http://63.181.47.189
ALLOWED_ORIGINS=https://margaz.netlify.app
```

Not: Bu degerler canli ortam icindir. Lokal gelistirmede
backend URL'i ihtiyaca gore degistirilebilir.
