/*
  ============================================================
  MARGAZ TANK SEVIYE SISTEMI - ENDUSTRIYEL VERSIYON v2.0
  ============================================================
  SIM900 + Arduino Uno + Watchdog Timer
  Lightsail Proxy uzerinden AWS'ye gonderim
  
  TASARIM HEDEFI: 1-2 yil kesintisiz calisma
  
  GUVENLIK KATMANLARI:
  1. Watchdog Timer (8 sn) - Sistem takilirsa reset
  2. Ardisik hata sayaci - 5 hatada GSM reset
  3. Free RAM kontrolu - RAM < 150 byte'da reset
  4. Preventif reset - Her 6 saatte tam sistem reset
  5. millis() overflow korumasi - 49 gun sonrasi icin
  
  BELLEK YONETIMI:
  - String sinifi KULLANILMIYOR (heap fragmentasyonu onlemi)
  - Tum stringler stack'te veya Flash'ta (F() makrosu)
  - Heap kullanimi: 0 byte
  
  ============================================================
*/

#include <SoftwareSerial.h>
#include <avr/wdt.h>

SoftwareSerial gsm(7, 8);

// ==========================================
// AYARLAR - HER CIHAZ ICIN DEGISTIR
// ==========================================
#define DEVICE_ID   "1-aktup"           // Cihaz kimligi (benzersiz olmali)
#define HOST        "63.181.47.189"     // Sunucu IP adresi
#define APN         "mgbs"              // Turkcell Kurumsal M2M APN

// Kalibrasyon (sensore gore ayarla)
#define RAW_EMPTY   44                  // Bos tank analog degeri
#define RAW_FULL    843                // Dolu tank analog degeri

// Gonderim ayarlari
#define SEND_INTERVAL_MIN  10           // Kac dakikada bir gonderilsin
#define MAX_ERRORS         5            // Kac hatadan sonra GSM resetlensin

// Guvenlik ayarlari
#define PREVENTIVE_RESET_HOURS  6       // Kac saatte bir preventif reset
#define MIN_FREE_RAM            150     // Minimum RAM (byte) - altinda reset
#define CMD_TIMEOUT_MS          3000    // AT komut timeout (ms)
#define HTTP_TIMEOUT_MS         20000   // HTTP islem timeout (ms)

// ==========================================
// GLOBAL DEGISKENLER (minimum heap kullanimi)
// ==========================================
int errorCount = 0;
unsigned long lastSuccessTime = 0;
unsigned long systemStartTime = 0;
unsigned long totalSendCount = 0;
unsigned long totalErrorCount = 0;

// GSM yanitlari icin sabit boyutlu buffer (HEAP KULLANMAZ)
#define GSM_BUFFER_SIZE 128
char gsmBuffer[GSM_BUFFER_SIZE];

// ==========================================
// SETUP
// ==========================================
void setup() {
  // WDT'yi baslangicta devre disi birak (bootloader guvenliği)
  wdt_disable();
  delay(100);
  
  Serial.begin(9600);
  gsm.begin(9600);
  
  // Baslangic mesaji
  Serial.println(F(""));
  Serial.println(F("============================================"));
  Serial.println(F("  MARGAZ TANK SISTEMI - ENDUSTRIYEL v2.0"));
  Serial.println(F("============================================"));
  Serial.print(F("Cihaz ID: "));
  Serial.println(F(DEVICE_ID));
  Serial.print(F("APN: "));
  Serial.println(F(APN));
  Serial.print(F("Gonderim araligi: "));
  Serial.print(SEND_INTERVAL_MIN);
  Serial.println(F(" dakika"));
  Serial.print(F("Preventif reset: Her "));
  Serial.print(PREVENTIVE_RESET_HOURS);
  Serial.println(F(" saatte"));
  Serial.println(F("--------------------------------------------"));
  
  // Free RAM goster
  Serial.print(F("Baslangic Free RAM: "));
  Serial.print(freeRam());
  Serial.println(F(" byte"));
  
  // GSM modulu icin bekle (guc stabilizasyonu)
  Serial.println(F("GSM modulu baslatiliyor (10 sn)..."));
  for (int i = 0; i < 10; i++) {
    delay(1000);
    Serial.print(F("."));
  }
  Serial.println();
  
  // GSM'i baslat
  if (!initGSM()) {
    Serial.println(F("GSM baslatilamadi! 30 sn sonra reset..."));
    delay(30000);
    softReset();
  }
  
  // Baslangic zamanini kaydet
  systemStartTime = millis();
  lastSuccessTime = millis();
  
  // WDT'yi etkinlestir - 8 saniye timeout
  wdt_enable(WDTO_8S);
  
  Serial.println(F("============================================"));
  Serial.println(F("Sistem HAZIR - Watchdog AKTIF (8 sn)"));
  Serial.println(F("============================================"));
  Serial.println();
}

// ==========================================
// MAIN LOOP
// ==========================================
void loop() {
  wdt_reset();
  
  // --- GUVENLIK KONTROLLERI ---
  
  // Kontrol 1: Free RAM
  int ram = freeRam();
  if (ram < MIN_FREE_RAM) {
    Serial.print(F("KRITIK: Dusuk RAM ("));
    Serial.print(ram);
    Serial.println(F(" byte) - RESET"));
    delay(1000);
    softReset();
  }
  
  // Kontrol 2: Preventif reset (her 6 saatte)
  // millis() overflow-safe karsilastirma
  unsigned long uptime = millis() - systemStartTime;
  unsigned long resetThreshold = (unsigned long)PREVENTIVE_RESET_HOURS * 3600UL * 1000UL;
  if (uptime >= resetThreshold) {
    Serial.println(F("PREVENTIF RESET - 6 saat doldu"));
    printStats();
    delay(1000);
    softReset();
  }
  
  // Kontrol 3: Uzun suredir basarili gonderim yok (30 dakika)
  unsigned long noSuccessTime = millis() - lastSuccessTime;
  if (noSuccessTime > 1800000UL) { // 30 dakika
    Serial.println(F("UYARI: 30 dakikadir basarili gonderim yok - GSM RESET"));
    initGSM();
    lastSuccessTime = millis(); // Sonsuz donguyu onle
  }
  
  // --- SENSOR OKUMA ---
  wdt_reset();
  
  int raw = analogRead(A0);
  int seviye = map(raw, RAW_EMPTY, RAW_FULL, 0, 100);
  seviye = constrain(seviye, 0, 100);
  
  // --- DURUM BILGISI ---
  Serial.println(F("--------------------------------------------"));
  Serial.print(F("Seviye: %"));
  Serial.print(seviye);
  Serial.print(F(" | Raw: "));
  Serial.print(raw);
  Serial.print(F(" | RAM: "));
  Serial.print(ram);
  Serial.print(F(" | Uptime: "));
  printUptime(uptime);
  Serial.println();
  
  // --- HTTP POST GONDER ---
  wdt_reset();
  totalSendCount++;
  
  bool success = httpPost(seviye);
  
  if (success) {
    errorCount = 0;
    lastSuccessTime = millis();
    Serial.println(F("[OK] Gonderim BASARILI"));
  } else {
    errorCount++;
    totalErrorCount++;
    Serial.print(F("[HATA] Ardisik hata: "));
    Serial.print(errorCount);
    Serial.print(F("/"));
    Serial.println(MAX_ERRORS);
    
    // 5 ardisik hatada GSM reset
    if (errorCount >= MAX_ERRORS) {
      Serial.println(F("GSM yeniden baslatiliyor..."));
      wdt_reset();
      initGSM();
      errorCount = 0;
    }
  }
  
  // --- ISTATISTIKLER ---
  Serial.print(F("Toplam: "));
  Serial.print(totalSendCount);
  Serial.print(F(" gonderim, "));
  Serial.print(totalErrorCount);
  Serial.println(F(" hata"));
  
  // --- BEKLEME (10 dakika) ---
  wdt_reset();
  Serial.print(F("Sonraki gonderim: "));
  Serial.print(SEND_INTERVAL_MIN);
  Serial.println(F(" dakika sonra..."));
  Serial.println();
  
  // 10 dakika = 600 saniye = 120 x 5 saniye
  // Her 5 saniyede WDT reset (8 sn timeout'un altinda)
  for (int i = 0; i < 120; i++) {
    delay(5000);
    wdt_reset();
    
    // Her dakikada bir nokta bas (yasadigimizi goster)
    if ((i + 1) % 12 == 0) {
      Serial.print(F("."));
      if ((i + 1) % 60 == 0) Serial.println(); // Her 5 dakikada satir atla
    }
    
    // Bekleme sirasinda da RAM kontrolu
    if (freeRam() < MIN_FREE_RAM) {
      Serial.println(F("\nKRITIK: RAM DUSUK - RESET"));
      softReset();
    }
  }
  Serial.println();
}

// ==========================================
// GSM INITIALIZATION
// ==========================================
bool initGSM() {
  wdt_disable();
  Serial.println(F(">>> GSM BASLAT <<<"));
  wdt_reset();
  
  // Buffer temizle
  clearGSMBuffer();
  
  // Temel AT komutlari
  if (!sendCmdWait(F("AT"), "OK", 2000)) {
    Serial.println(F("GSM yanit vermiyor!"));
    return false;
  }
  
  wdt_reset();
  sendCmdWait(F("ATE0"), "OK", 1000);           // Echo kapat
  sendCmdWait(F("AT+CIURC=0"), "OK", 1000);     // Unsolicited mesajlari kapat
  
  // Sinyal kalitesi
  wdt_reset();
  sendCmd(F("AT+CSQ"));
  delay(1000);
  readGSMToBuffer();
  Serial.print(F("Sinyal: "));
  Serial.println(gsmBuffer);
  
  // SIM kart kontrolu
  wdt_reset();
  if (!sendCmdWait(F("AT+CPIN?"), "READY", 3000)) {
    Serial.println(F("SIM kart hatasi!"));
    return false;
  }
  
  // Network kayit kontrolu (60 sn bekle)
  Serial.println(F("Network aranıyor..."));
  wdt_reset();
  bool registered = false;
  for (int i = 0; i < 30; i++) {
    wdt_reset();
    gsm.println(F("AT+CREG?"));
    delay(2000);
    readGSMToBuffer();
    
    // +CREG: 0,1 veya +CREG: 0,5 = kayitli
    if (strstr(gsmBuffer, ",1") || strstr(gsmBuffer, ",5")) {
      registered = true;
      Serial.println(F("Network KAYITLI"));
      break;
    }
    Serial.print(F("."));
  }
  
  if (!registered) {
    Serial.println(F("\nNetwork bulunamadi!"));
    return false;
  }
  
  // GPRS Baglantisi
  wdt_reset();
  Serial.println(F("GPRS baslatiliyor..."));
  
  // Eski baglantilari kapat
  sendCmd(F("AT+HTTPTERM"));
  delay(500);
  sendCmd(F("AT+SAPBR=0,1"));
  delay(2000);
  wdt_reset();
  
  // GPRS ayarlari
  if (!sendCmdWait(F("AT+CGATT=1"), "OK", 3000)) {
    Serial.println(F("GPRS attach basarisiz!"));
    wdt_enable(WDTO_8S);
    return false;
  }
  wdt_reset();
  
  sendCmdWait(F("AT+SAPBR=3,1,\"CONTYPE\",\"GPRS\""), "OK", 2000);
  wdt_reset();
  
  // APN ayarla (Turkcell Kurumsal)
  gsm.print(F("AT+SAPBR=3,1,\"APN\",\""));
  gsm.print(F(APN));
  gsm.println(F("\""));
  delay(2000);
  readGSMToBuffer();
  wdt_reset();
  
  // Bearer ac (3 deneme)
  bool bearerOk = false;
  for (int attempt = 0; attempt < 3; attempt++) {
    wdt_reset();
    Serial.print(F("Bearer aciliyor (deneme "));
    Serial.print(attempt + 1);
    Serial.println(F(")..."));
    
    gsm.println(F("AT+SAPBR=1,1"));
    for (int d = 0; d < 10; d++) {
        delay(1000);
        wdt_reset();
    }
    
    
    // Bearer durumu kontrol
    gsm.println(F("AT+SAPBR=2,1"));
    delay(2000);
    readGSMToBuffer();
    
    // +SAPBR: 1,1 = baglanti aktif
    if (strstr(gsmBuffer, ",1,")) {
      bearerOk = true;
      Serial.println(F("Bearer AKTIF"));
      break;
    }
    
    // Basarisiz - kapat ve tekrar dene
    sendCmd(F("AT+SAPBR=0,1"));
    delay(2000);
  }
  
  if (!bearerOk) {
    Serial.println(F("GPRS baglantisi kurulamadi!"));
    wdt_enable(WDTO_8S);
    return false;
  }
  
  // IP adresini goster
  wdt_reset();
  gsm.println(F("AT+SAPBR=2,1"));
  delay(2000);
  readGSMToBuffer();
  Serial.print(F("IP: "));
  Serial.println(gsmBuffer);
  
  Serial.println(F(">>> GSM HAZIR <<<"));
  wdt_enable(WDTO_8S);
  return true;
}

// ==========================================
// HTTP POST
// ==========================================
bool httpPost(int level) {
  Serial.println(F(">>> HTTP POST <<<"));
  wdt_reset();
  
  // Once GPRS baglantisini kontrol et
  if (!checkGPRSConnection()) {
    Serial.println(F("GPRS kopuk - yeniden baglaniliyor..."));
    if (!initGSM()) {
      return false;
    }
  }
  
  // Buffer temizle
  clearGSMBuffer();
  
  // Eski HTTP oturumunu kapat (garanti olsun)
  gsm.println(F("AT+HTTPTERM"));
  delay(500);
  readGSMToBuffer();
  wdt_reset();
  
  // HTTP INIT
  if (!sendCmdWait(F("AT+HTTPINIT"), "OK", 3000)) {
    Serial.println(F("HTTPINIT basarisiz"));
    gsm.println(F("AT+HTTPTERM")); // Temizlik
    return false;
  }
  wdt_reset();
  
  // CID ayarla
  sendCmdWait(F("AT+HTTPPARA=\"CID\",1"), "OK", 2000);
  wdt_reset();
  
  // URL ayarla
  gsm.print(F("AT+HTTPPARA=\"URL\",\"http://"));
  gsm.print(F(HOST));
  gsm.println(F("/api/telemetry\""));
  delay(1500);
  readGSMToBuffer();
  wdt_reset();
  
  // Content-Type
  sendCmdWait(F("AT+HTTPPARA=\"CONTENT\",\"application/json\""), "OK", 2000);
  wdt_reset();
  
  // JSON olustur (STACK'te - heap kullanmaz)
  char json[80];
  snprintf(json, sizeof(json), "{\"tank_level\":%d,\"device_id\":\"%s\"}", level, DEVICE_ID);
  
  int jsonLen = strlen(json);
  Serial.print(F("JSON ("));
  Serial.print(jsonLen);
  Serial.print(F(" byte): "));
  Serial.println(json);
  
  // HTTPDATA
  gsm.print(F("AT+HTTPDATA="));
  gsm.print(jsonLen);
  gsm.println(F(",10000"));
  delay(1000);
  readGSMToBuffer();
  
  // DOWNLOAD bekle
  if (!strstr(gsmBuffer, "DOWNLOAD")) {
    Serial.println(F("DOWNLOAD bekleniyor..."));
    delay(1000);
    readGSMToBuffer();
  }
  wdt_reset();
  
  // JSON gonder
  gsm.print(json);
  delay(3000);
  readGSMToBuffer();
  wdt_reset();
  
  // HTTP ACTION (POST)
  // SIM900 bazen uzun sure yanit vermez, bu sirada WDT reset atabilir.
  // HTTP isleminde WDT'yi gecici kapatıyoruz.
  wdt_disable();
  gsm.println(F("AT+HTTPACTION=1"));
  
  // Yanit bekle (20 saniye, WDT-safe)
  Serial.print(F("Yanit bekleniyor"));
  bool gotResponse = false;
  for (int i = 0; i < 4; i++) {
    delay(5000);
    wdt_reset();
    Serial.print(F("."));
    
    readGSMToBuffer();
    if (strstr(gsmBuffer, "+HTTPACTION")) {
      gotResponse = true;
      break;
    }
  }
  Serial.println();
  
  // Son okuma
  if (!gotResponse) {
    readGSMToBuffer();
  }
  
  // Sonucu analiz et
  bool success = false;
  if (strstr(gsmBuffer, ",200,") || strstr(gsmBuffer, ",201,")) {
    success = true;
    Serial.println(F("HTTP 200/201 OK"));
  } else {
    Serial.print(F("HTTP Yanit: "));
    Serial.println(gsmBuffer);
  }
  
  wdt_reset();
  
  // Sunucu yanitini oku (debug icin)
  gsm.println(F("AT+HTTPREAD"));
  delay(2000);
  readGSMToBuffer();
  if (strlen(gsmBuffer) > 0) {
    Serial.print(F("Sunucu: "));
    Serial.println(gsmBuffer);
  }
  
  // HTTP oturumunu MUTLAKA kapat
  gsm.println(F("AT+HTTPTERM"));
  delay(500);
  readGSMToBuffer();
  
  // HTTP tamamlandi, WDT'yi tekrar ac
  wdt_enable(WDTO_8S);
  wdt_reset();
  return success;
}

// ==========================================
// GPRS BAGLANTI KONTROLU
// ==========================================
bool checkGPRSConnection() {
  // Bearer durumu sorgula
  gsm.println(F("AT+SAPBR=2,1"));
  delay(2000);
  readGSMToBuffer();
  
  // +SAPBR: 1,1,"IP" = bagli
  // +SAPBR: 1,3 = kapali
  if (strstr(gsmBuffer, ",1,")) {
    return true;  // Baglanti aktif
  }
  
  return false;  // Baglanti kopuk
}

// ==========================================
// GSM BUFFER ISLEMLERI (STRING SINIFI YOK!)
// ==========================================

// Buffer'i temizle
void clearGSMBuffer() {
  while (gsm.available()) {
    gsm.read();
  }
  memset(gsmBuffer, 0, GSM_BUFFER_SIZE);
}

// GSM'den buffer'a oku
void readGSMToBuffer() {
  int idx = 0;
  unsigned long start = millis();
  
  while ((millis() - start) < 1000 && idx < GSM_BUFFER_SIZE - 1) {
    if (gsm.available()) {
      char c = gsm.read();
      if (c >= 32 || c == '\n') {  // Printable veya newline
        gsmBuffer[idx++] = c;
      }
    }
  }
  gsmBuffer[idx] = '\0';
}

// Komut gonder ve Serial'a yaz
void sendCmd(const __FlashStringHelper* cmd) {
  gsm.println(cmd);
  delay(CMD_TIMEOUT_MS);
  readGSMToBuffer();
}

// Komut gonder ve belirli yanit bekle
bool sendCmdWait(const __FlashStringHelper* cmd, const char* expected, unsigned long timeout) {
  clearGSMBuffer();
  gsm.println(cmd);
  
  unsigned long start = millis();
  int idx = 0;
  
  while ((millis() - start) < timeout && idx < GSM_BUFFER_SIZE - 1) {
    wdt_reset();
    if (gsm.available()) {
      char c = gsm.read();
      if (c >= 32 || c == '\n') {
        gsmBuffer[idx++] = c;
      }
      gsmBuffer[idx] = '\0';
      
      // Beklenen yanit geldi mi?
      if (strstr(gsmBuffer, expected)) {
        return true;
      }
    }
  }
  
  return false;
}

// ==========================================
// YARDIMCI FONKSIYONLAR
// ==========================================

// Free RAM hesapla (heap fragmentasyonu tespiti)
int freeRam() {
  extern int __heap_start, *__brkval;
  int v;
  return (int)&v - (__brkval == 0 ? (int)&__heap_start : (int)__brkval);
}

// Soft reset (watchdog ile)
void softReset() {
  Serial.println(F(">>> SISTEM RESET <<<"));
  delay(100);
  wdt_enable(WDTO_15MS);
  while (1) {} // Watchdog reset bekle
}

// Uptime yazdir
void printUptime(unsigned long ms) {
  unsigned long secs = ms / 1000;
  unsigned long mins = secs / 60;
  unsigned long hours = mins / 60;
  unsigned long days = hours / 24;
  
  if (days > 0) {
    Serial.print(days);
    Serial.print(F("g "));
  }
  Serial.print(hours % 24);
  Serial.print(F("s "));
  Serial.print(mins % 60);
  Serial.print(F("dk"));
}

// Istatistikleri yazdir
void printStats() {
  Serial.println(F("========== ISTATISTIKLER =========="));
  Serial.print(F("Toplam gonderim: "));
  Serial.println(totalSendCount);
  Serial.print(F("Toplam hata: "));
  Serial.println(totalErrorCount);
  Serial.print(F("Basari orani: "));
  if (totalSendCount > 0) {
    Serial.print(100 - (totalErrorCount * 100 / totalSendCount));
    Serial.println(F("%"));
  } else {
    Serial.println(F("N/A"));
  }
  Serial.print(F("Free RAM: "));
  Serial.print(freeRam());
  Serial.println(F(" byte"));
  Serial.println(F("==================================="));
}
