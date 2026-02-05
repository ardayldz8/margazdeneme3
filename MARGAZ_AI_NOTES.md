# Margaz Proje - AI Asistan Notları

> **Oluşturulma:** 30 Ocak 2026  
> **Son Güncelleme:** 05 Şubat 2026  
> **Versiyon:** 1.2.1 (Frontend Tarih Aralığı + Dokümantasyon)

---

## 🎯 Proje Özeti

**Margaz Tank Telemetri Sistemi** - LPG tank izleme IoT projesi
- **Backend:** Node.js + Express + Prisma + SQLite
- **Frontend:** React + Vite + Tailwind + Netlify
- **Donanım:** Arduino + GSM modül (SIM800L/SIM900)
- **Deployment:** AWS Lightsail (backend) + Netlify (frontend)
- **IP:** 63.181.47.189

---

## ✅ Tamamlanan İyileştirmeler

### Phase 1 - Kritik Hata Düzeltmesi (30 Ocak 2026)

#### 1. tank_level Validasyonu
- **Sorun:** Arduino'dan gelen veride `tank_level` eksikti, Prisma hatası oluşuyordu
- **Çözüm:** `backend/src/routes/telemetry.routes.ts` dosyasına input validasyonu eklendi
- **Değişiklikler:**
  - `tank_level` ve `device_id` zorunluluk kontrolü
  - 0-100 aralığı validasyonu
  - `NaN` kontrolü
- **Commit:** `96ffb15`
- **Deploy:** ✅ Lightsail'de deploy edildi

#### 2. Winston Logging Sistemi ✅ Tamamlandı
- **Durum:** ✅ GitHub'a push edildi ve Lightsail'de deploy edildi
- **Commit:** `b8397ec`
- **Yapılanlar:**
  - Winston paketi kuruldu (`npm install winston`)
  - `backend/src/utils/logger.ts` oluşturuldu
  - `telemetry.routes.ts` güncellendi (console.log → logger)
  - `.gitignore` güncellendi (`.md` ve Arduino dosyaları eklendi)
- **Log Dosyaları:**
  - `logs/error.log` - Hata logları
  - `logs/combined.log` - Tüm loglar
  - `logs/exceptions.log` - Uncaught exceptions
  - `logs/rejections.log` - Unhandled rejections
- **Deploy:** ✅ Lightsail'de çalışıyor (PM2: margaz-proxy online)

#### 3. Jest Test Framework ✅ Tamamlandı
- **Durum:** ✅ Lokalde kuruldu ve testler yazıldı
- **Yapılanlar:**
  - Jest + Supertest kurulumu
  - `jest.config.js` yapılandırma dosyası
  - Test setup dosyası
  - **Test Dosyaları:**
    - `health.test.ts` - Health check (2 test)
    - `telemetry.test.ts` - Telemetry (9 test)
    - `auth.test.ts` - Auth endpoints (16 test)
    - `dealer.test.ts` - Dealer CRUD (11 test)
    - `device.test.ts` - Device CRUD (9 test)
- **Toplam: 47 test** (ilk kurulum)
- **Test Komutları:**
  - `npm test` - Tüm testleri çalıştır
  - `npm run test:watch` - Değişiklikleri izle
  - `npm run test:coverage` - Coverage raporu

#### 4. Jest Test DB İzolasyonu ✅ Tamamlandı
- **Sorun:** Testler `dev.db` üzerinden çalışıyordu (gerçek veri riski)
- **Çözüm:** Testler artık **izole `test.db`** üzerinde çalışıyor
- **Uygulama:**
  - `backend/src/__tests__/env.ts` → `DATABASE_URL=file:./test.db`
  - `backend/src/__tests__/globalSetup.ts` → `prisma db push --skip-generate`
  - `backend/src/__tests__/globalTeardown.ts` → test.db cleanup (lock tolerant)
  - `backend/jest.config.js` → globalSetup/globalTeardown + maxWorkers: 1
- **Sonuç:** ✅ 58 test localde başarıyla geçti

#### 5. Eksik Testler Tamamlandı ✅
- **Eklenen testler:**
  - `auth.middleware.test.ts` (token/role senaryoları)
  - `telemetry.test.ts` (dealer update + history + AWS fail)
  - `zz_rate_limit.test.ts` (telemetry rate limit)
#### 6. Servis ve Rate Limit Testleri ✅
- **Eklenen testler:**
  - `auth.rate_limit.test.ts`
  - `geocoding.service.test.ts`
  - `epdk.service.test.ts`
  - `serial.service.test.ts`
- **Yeni toplam:** 72 test

#### 7. 404 Davranışı Düzeltmesi ✅
- **Problem:** Dealer/Device update/delete için olmayan kayıtlar 500 dönüyordu.
- **Çözüm:** P2025 hatası 404 olarak döndürülüyor.
- **Etkilenen dosyalar:**
  - `backend/src/routes/dealer.routes.ts`
  - `backend/src/routes/device.routes.ts`
- **Testler güncellendi:** dealer/device update artık 404 bekliyor.

#### 8. Sync Route Testi ✅
- **Eklenen test:** `sync.routes.test.ts`
- **Kapsam:** auth yok/role kontrol/başarılı sync/hata senaryosu

#### 9. Frontend Testleri ✅
- **Test altyapısı:** Vitest + Testing Library + jsdom
- **Test dosyaları:** `frontend/src/__tests__/` altında 16 test dosyası
- **Son test run (30 Ocak 2026):** 26 test; 26 pass; 16 suite pass
- **Coverage (v8):** Statements 71.67%, Branches 59.72%, Functions 47.05%, Lines 71.67%
- **Not:** npm install sonrası 7 vuln bildirildi (npm audit ile ele alınabilir)

---

## 🚀 Yapılacaklar (Güncel Tek Liste)

### Phase 1 - Risksiz İşlemler
- [x] Swagger/OpenAPI dokümantasyonu
- [x] Error Boundaries (frontend)
- [x] Frontend test coverage raporu (Vitest coverage paketi kuruldu)
- [ ] Dokümantasyon takibi: `.md` dosyalarını `.gitignore` dışında tutma kararı (opsiyonel)

### Phase 2 - Dikkatli İşlemler
- [x] PrismaClient Singleton pattern (core uygulama)
- [x] JWT Secret validasyonu (env kontrolü)
- [ ] Input Validation genişletme (tüm route'lar)

### Phase 3 - Yüksek Riskli İşlemler
- [ ] Database Migration stratejisi düzeltme (`db push` → `migrate deploy`)
- [ ] API Key sistemi (cihaz doğrulama)

### Phase 4 - İsteğe Bağlı
- [ ] SQLite → PostgreSQL geçişi
- [ ] Docker containerization
- [ ] CI/CD pipeline

---

## 📁 Son Değişiklikler (Local - Push Bekliyor)

| Dosya | Durum | Açıklama |
|-------|-------|----------|
| `backend/package.json` | Modifiye | Jest/Supertest test altyapısı |
| `backend/package-lock.json` | Modifiye | Jest/Supertest test altyapısı |
| `backend/jest.config.js` | Yeni | Jest yapılandırması |
| `backend/src/__tests__/` | Yeni | Backend testleri |
| `backend/prisma/dev.db` | Modifiye | Lokal DB (push edilmez) |
| `backend/test.db` | Yeni | Test DB (push edilmez) |
| `frontend/src/pages/DealerDetail.tsx` | Modifiye | Grafik için tarih/saat aralığı seçimi eklendi |
| `arduino_sk` | Untracked | Kalibrasyon sketch (gitignore) |

---

## 🔧 Sistem Bilgileri

### Lightsail Sunucu:
- **IP:** 63.181.47.189
- **User:** bitnami
- **Proje Dizini:** `/home/bitnami/margaz-yeni`
- **PM2 Process:** `margaz-proxy`
- **Node.js:** v20.x

### Veritabanı:
- **Tip:** SQLite
- **Dosya:** `/backend/prisma/dev.db`
- **Boyut:** ~768K (şu an)
- **Yedekler:** `/home/bitnami/margaz-backups/`

### Çevre Değişkenleri (.env):
```env
DATABASE_URL="file:./dev.db"
PORT=3000
JWT_SECRET=[gizli]
AWS_TELEMETRY_URL=https://mbgaykif87.execute-api.eu-north-1.amazonaws.com/
CORS_ORIGINS=https://margaz.netlify.app,http://localhost:5173
```

---

## 📊 Son Sistem Durumu

- ✅ **Uygulama:** Online (PM2: margaz-proxy)
- ✅ **Veri Akışı:** Aktif (3 cihaz: 1-aktup, 2-aktup, 2-aktupv2)
- ✅ **AWS Entegrasyonu:** Çalışıyor
- ✅ **Yedekleme:** Yapılandırıldı
- ✅ **Logging:** Winston deploy edildi
- ✅ **Test Framework:** Jest kurulu ve aktif (76 test, hepsi geçti)
- ✅ **Frontend Testleri:** Vitest çalışıyor (15 test dosyası, hepsi geçti)
- ✅ **Frontend Testleri:** Vitest çalışıyor (16 test dosyası, hepsi geçti)
- ✅ **Frontend Coverage:** `npm run test:coverage` çalıştı (v8)
- ✅ **Error Boundary:** root seviyede fallback eklendi
- ✅ **404 Düzeltmesi:** Dealer/Device update artık doğru HTTP status dönüyor
- ✅ **Test İzolasyonu:** test.db ile güvenli test ortamı
- ✅ **GitHub:** Son commit `75a7524`
- ✅ **Lightsail:** sqlite3 kuruldu, `dev.db` yedeği alındı (`backup-20260130.db`)
- ℹ️ **Health endpoint:** `/api/health` mevcut değil; 404 normal
- ✅ **Swagger UI:** `/docs` admin JWT ile korumalı
- ✅ **OpenAPI spec:** `/docs/openapi.yaml` admin JWT ile erişilir
- ✅ **JWT Validasyonu:** prod'da aktif, startup fail-fast kontrolü eklendi

---

## 📝 Önemli Notlar

### Dikkat Edilecek Noktalar:
1. **Her deploy öncesi yedekleme yap:**
   ```bash
   sqlite3 dev.db ".backup 'backup-$(date +%Y%m%d).db'"
   ```

2. **PM2 restart sonrası logları kontrol et:**
   ```bash
   pm2 logs margaz-proxy --lines 20
   ```

3. **TypeScript derleme hatalarını kontrol et:**
    ```bash
    npm run build
    ```
4. **Testleri localde izole çalıştır:**
    ```bash
    cd backend
    npm test
    ```

5. **Frontend güvenlik uyarıları (npm audit):**
   - `npm audit fix` çalıştırıldı, kalan 6 moderate uyarı var.
   - Uyarılar `vite`/`esbuild` zincirinden geliyor.
   - `vite` 5.4.21'e güncellendi; uyarılar devam ediyor.
   - Tam düzeltme `npm audit fix --force` ile `vite@7.x` gerektiriyor (breaking).
   - Şimdilik **force kullanılmayacak**; karar öncesi değerlendirme yapılacak.

6. **Swagger / JWT erişimi:**
   - `/docs` ve `/docs/openapi.yaml` sadece admin JWT ile erişilebilir
   - JWT almak için: `POST /api/auth/login`

### Kullanıcı Tercihleri:
- Kodları double-check etmek istiyor (dikkatli yaklaşım)
- Adım adım ilerlemeyi tercih ediyor
- Her değişikliği dokümante etmek istiyor
- SYSTEM_DOCUMENTATION.md'yi güncel tutuyor

---

## 🎯 AI Asistan Görev Özeti

**Son Yapılan:**
- ✅ Frontend testleri düzeltildi ve geçti (24/24)
- ✅ Frontend coverage raporu alındı (v8)
- ✅ Vite 5.4.21 güncellendi (breaking yok)
- ✅ `baseline-browser-mapping` güncellendi
- ✅ `npm audit fix` uygulandı (6 moderate kaldı)
- ✅ Dealer/Device 404 davranışı düzeltildi ve push edildi (`75a7524`)
- ✅ `.md` ve Arduino dosyaları Git takibinden çıkarıldı (repo temizliği)
- ✅ Bayi detay grafiğine tarih/saat aralığı seçimi eklendi (1/24/7 kaldırıldı)

**Sonraki Görev (Kullanıcı ile Birlikte Karar Verilecek):**
- Backend test altyapısının push edilip edilmeyeceği
- Input validation genişletme

---

## 🔍 Teknik Detaylar

### Logger Yapılandırması (`backend/src/utils/logger.ts`)

**Log Seviyeleri:**
- `error` - Hatalar (error.log)
- `warn` - Uyarılar (combined.log)
- `info` - Bilgi mesajları (combined.log)
- `debug` - Debug mesajları (sadece development)

**Log Formatı (JSON):**
```json
{
  "timestamp": "2026-01-30T08:20:15.123Z",
  "level": "info",
  "message": "Telemetry received",
  "service": "margaz-backend",
  "environment": "production",
  "device_id": "1-aktup",
  "level": 45,
  "ip": "185.92.12.34"
}
```

**Dosya Rotasyonu:**
- Maksimum dosya boyutu: 5MB
- Maksimum dosya sayısı: 5
- Eski loglar otomatik silinir

### Değişen Kod Örnekleri

**Önce:**
```typescript
console.log(`📡 Telemetry Received: Level=${tank_level}% (Device: ${device_id})`);
console.warn(`⚠️ Missing tank_level from device: ${device_id}`);
console.error('❌ Telemetry Error:', error);
```

**Sonra:**
```typescript
logger.info('Telemetry received', { device_id, level, ip: req.ip });
logger.warn('Missing tank_level in telemetry request', { device_id, body: req.body });
logger.error('Telemetry processing error', { error: error.message, stack: error.stack });
```

### Git Durumu

**Not:** Bu bölüm örnek niteliğindedir. Güncel durum için `git status` ve `git log` çalıştırılmalıdır.

### Test Komutları

**Deploy Sonrası Test:**
```bash
# 1. Log dosyalarının oluştuğunu kontrol et
ls -la /home/bitnami/margaz-yeni/backend/logs/

# 2. Log içeriğini kontrol et
tail -20 /home/bitnami/margaz-yeni/backend/logs/combined.log

# 3. Hata loglarını kontrol et
tail -20 /home/bitnami/margaz-yeni/backend/logs/error.log

# 4. PM2 loglarını kontrol et
pm2 logs margaz-proxy --lines 20
```

### Geri Alma Planı (Rollback)

**Eğer bir şeyler ters giderse:**
```bash
# 1. PM2 durdur
pm2 stop margaz-proxy

# 2. Son yedekten geri yükle
cp /home/bitnami/margaz-backups/db-XXXX.db /home/bitnami/margaz-yeni/backend/prisma/dev.db

# 3. Kodu geri al
cd /home/bitnami/margaz-yeni
git reset --hard HEAD~1

# 4. Başlat
pm2 start margaz-proxy
```

### İletişim Bilgileri

**Kullanıcı:** Arda Yıldız
**Proje:** Margaz Tank Telemetri Sistemi
**GitHub:** github.com/ardayldz8/margazdeneme3  
**Tarih:** 30 Ocak 2026
