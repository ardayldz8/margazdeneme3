# Margaz Tank Telemetri Sistemi - Teknik Dokümantasyon

> **Son Güncelleme:** 21 Ocak 2026

## Sistem Mimarisi

```
┌──────────────────────┐
│  Tank + GVL-101      │  Rochester Hall Effect Sensör
│  (Fiziksel Sensör)   │  Analog çıkış: 0-5V
└──────────┬───────────┘
           │ A0 pin
           ▼
┌──────────────────────┐
│     Arduino Uno      │  Sensör okuma + JSON oluşturma
│   + SIM900 Shield    │  GPRS ile HTTP POST
└──────────┬───────────┘
           │ HTTP (port 80)
           ▼
┌──────────────────────┐
│  AWS Lightsail       │  IP: 63.181.47.189
│  "MargazProxy"       │  Node.js backend (PM2)
│  Port: 80 → 3000     │  Endpoint: /api/telemetry
└──────────┬───────────┘
           │ HTTPS
           ▼
┌──────────────────────┐
│  AWS API Gateway     │  mbgaykif87.execute-api.eu-north-1.amazonaws.com
│  + Lambda + DynamoDB │  Veri depolama + işleme
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│  Frontend Dashboard  │  margaz.netlify.app
│  (Netlify)           │  Tank doluluk görselleştirme
└──────────────────────┘
```

---

## Bileşen Detayları

### 1. Arduino + SIM900

**Dosya:** `arduino_sketch/tank_gsm.ino`

| Parametre | Değer |
|-----------|-------|
| SoftwareSerial | Pin 7 (RX), Pin 8 (TX) |
| Baud Rate | 9600 |
| Sensör Pin | A0 (Analog) |
| APN | `internet` (Turkcell) |
| Gönderim Aralığı | 60 saniye |

**Kalibrasyon Değerleri:**
```cpp
const int RAW_EMPTY = 10;   // Tank boşken okunan değer
const int RAW_FULL = 1042;  // Tank doluyken okunan değer
```

> ⚠️ Bu değerler GVL-101 ile kalibre edilmiştir. Sensör değişirse yeniden kalibrasyon gerekir.

**JSON Format:**
```json
{
  "tank_level": 47,
  "device_id": "margaz_tank_01"
}
```

---

### 2. Lightsail Proxy (MargazProxy)

**Bağlantı Bilgileri:**
- **IP:** 63.181.47.189
- **SSH:** Lightsail Console → Connect using SSH
- **Kullanıcı:** bitnami

**Port Yönlendirme:**
```bash
# Port 80 gelen istekleri port 3000'e yönlendir
sudo iptables -t nat -A PREROUTING -p tcp --dport 80 -j REDIRECT --to-port 3000
```

> ⚠️ Bu komut sunucu restart edilirse kaybolur! Kalıcı yapmak için `/etc/rc.local` dosyasına ekle.

**PM2 Servisi:**
```bash
pm2 status              # Servis durumu
pm2 logs margaz-proxy   # Log'ları izle
pm2 restart margaz-proxy # Yeniden başlat
```

**Backend Dosyaları:**
```
/home/bitnami/margaz-yeni/backend/
├── dist/
│   ├── server.js           # Ana sunucu
│   └── routes/
│       └── telemetry.routes.js  # /api/telemetry endpoint
└── .env                    # Ortam değişkenleri
```

---

### 3. AWS Bileşenleri

| Bileşen | Detay |
|---------|-------|
| Region | eu-north-1 (Stockholm) |
| API Gateway | mbgaykif87.execute-api.eu-north-1.amazonaws.com |
| Lambda | Telemetri işleme |
| DynamoDB | Veri depolama |

---

## Sorun Giderme

### SIM900 Bağlantı Sorunları

| Hata Kodu | Anlam | Çözüm |
|-----------|-------|-------|
| +HTTPACTION:1,200 | ✅ Başarılı | - |
| +HTTPACTION:1,307 | Redirect | HTTPS yerine HTTP kullan |
| +HTTPACTION:1,404 | Endpoint bulunamadı | URL path'i kontrol et |
| +HTTPACTION:1,500 | Sunucu hatası | Lightsail loglarını kontrol et |
| +HTTPACTION:1,601 | Bağlantı hatası | APN ve GPRS ayarlarını kontrol et |

### Lightsail Kontrolleri

```bash
# Port 80'de ne çalışıyor?
sudo netstat -tlnp | grep 80

# Backend çalışıyor mu?
pm2 list

# Son loglar
pm2 logs margaz-proxy --lines 50

# Port yönlendirme aktif mi?
sudo iptables -t nat -L -n
```

### Kalibrasyon Sorunları

Eğer GVL ile dashboard arasında fark varsa:

1. GVL'nin gösterdiği değeri ve Serial Monitor'deki Raw değeri not et
2. En az 2 farklı seviyede ölçüm yap
3. Lineer denklem kur:
   ```
   (RAW1, SEVIYE1) ve (RAW2, SEVIYE2) noktalarından:
   m = (SEVIYE2 - SEVIYE1) / (RAW2 - RAW1)
   RAW_EMPTY = RAW1 - (SEVIYE1 / m)
   RAW_FULL = RAW_EMPTY + (100 / m)
   ```

---

## Güç Gereksinimleri

| Bileşen | Voltaj | Akım |
|---------|--------|------|
| Arduino Uno | 5V veya 7-12V DC | 50mA |
| SIM900 Shield | 5V | 2A (pik) |

> ⚠️ SIM900 pik akımda 2A çeker. USB güç yetmez, harici adaptör kullan!

---

## Önemli Dosyalar

| Dosya | Açıklama |
|-------|----------|
| `arduino_sketch/tank_gsm.ino` | Ana Arduino kodu |
| `arduino_sketch/sim900_test.ino` | SIM900 test kodu |
| `backend/src/routes/telemetry.routes.ts` | Lightsail backend endpoint |
| `backend/src/aws-setup/lambda/index.js` | AWS Lambda kodu |

---

## Acil Durum İletişimi

Sistem çalışmıyorsa sırasıyla kontrol et:

1. **Arduino** - Serial Monitor'de hata var mı?
2. **GSM Sinyal** - `AT+CSQ` ile sinyal gücü (10+ olmalı)
3. **GPRS** - `AT+SAPBR=2,1` ile IP alıyor mu?
4. **Lightsail** - `pm2 status` online mı?
5. **Port** - `iptables` yönlendirmesi aktif mi?
6. **AWS** - CloudWatch logları hata veriyor mu?
