/*
  Tank Seviye + SIM900 + Watchdog Timer
  Lightsail Proxy uzerinden AWS'ye gonderim
  WDT: Sistem takilirsa 8 saniyede otomatik reset
*/

#include <SoftwareSerial.h>
#include <avr/wdt.h> // Watchdog Timer kütüphanesi

SoftwareSerial gsm(7, 8);

// ==========================================
// AYARLAR - HER CIHAZ ICIN DEGISTIR
// ==========================================
#define DEVICE_ID   "1-aktup"      // Cihaz kimliği (benzersiz olmalı)
#define HOST        "63.181.47.189" // Sunucu IP adresi
#define APN         "internet"      // Operatör APN (genelde "internet")

// Kalibrasyon (sensöre göre ayarla)
#define RAW_EMPTY   10    // Boş tank analog değeri
#define RAW_FULL    1042  // Dolu tank analog değeri

// Gönderim ayarları
#define SEND_INTERVAL_MIN  10  // Kaç dakikada bir gönderilsin (10 dakika)
#define MAX_ERRORS         3   // Kaç hatadan sonra GSM resetlensin
// ==========================================

// Hata sayacı
int errorCount = 0;

void setup() {
  // WDT'yi başlangıçta devre dışı bırak (bootloader için)
  wdt_disable();

  Serial.begin(9600);
  gsm.begin(9600);

  Serial.println(F("=== MARGAZ TANK SISTEMI ==="));
  Serial.println(F("Watchdog Timer: AKTIF (8s)"));
  delay(3000);

  initGSM();

  // WDT'yi etkinleştir - 8 saniye timeout
  wdt_enable(WDTO_8S);

  Serial.println(F("Sistem hazir!"));
}

void loop() {
  // Watchdog'u besle - sistem çalışıyor
  wdt_reset();

  int raw = analogRead(A0);
  int seviye = map(raw, RAW_EMPTY, RAW_FULL, 0, 100);
  seviye = constrain(seviye, 0, 100);

  Serial.print(F("Seviye: %"));
  Serial.print(seviye);
  Serial.print(F(" (Raw:"));
  Serial.print(raw);
  Serial.println(F(")"));

  // HTTP POST gönder
  bool success = httpPost(seviye);

  if (success) {
    errorCount = 0;
    Serial.println(F("✓ Basarili!"));
  } else {
    errorCount++;
    Serial.print(F("✗ Hata sayisi: "));
    Serial.println(errorCount);

    // 3 ardışık hata sonrası GSM'i yeniden başlat
    if (errorCount >= MAX_ERRORS) {
      Serial.println(F("GSM yeniden baslatiliyor..."));
      initGSM();
      errorCount = 0;
    }
  }

  // Watchdog'u besle - döngü sonu
  wdt_reset();

  // 10 dakika bekle (60 x 10 saniye = 600 saniye)
  Serial.println(F("--- 10 dakika bekleniyor... ---"));
  for (int i = 0; i < 60; i++) {
    // 10 saniyeyi 2x5 saniye olarak böl (WDT 8 saniye, güvenli olmak için 5 saniye)
    delay(5000);
    wdt_reset();
    delay(5000);
    wdt_reset();
    
    // Her 6 iterasyonda (1 dakikada) bir bilgi ver
    if ((i + 1) % 6 == 0) {
      Serial.print(F("Beklenen sure: "));
      Serial.print((i + 1) / 6);
      Serial.println(F(" dakika"));
      wdt_reset(); // Serial yazdırma sırasında da besle
    }
  }
  Serial.println(F("--- Bekleme tamamlandi! ---"));
  wdt_reset();
}

void initGSM() {
  Serial.println(F("GSM baslatiliyor..."));

  wdt_reset();
  sendCmd("AT");
  sendCmd("ATE0");
  sendCmd("AT+CSQ");

  // GPRS - Önce eski bağlantıyı kapat
  wdt_reset();
  sendCmd("AT+SAPBR=0,1"); // Eski bearer'ı kapat
  delay(2000);
  
  wdt_reset();
  sendCmd("AT+CGATT=1");
  sendCmd("AT+SAPBR=3,1,\"CONTYPE\",\"GPRS\"");
  gsm.print("AT+SAPBR=3,1,\"APN\",\"");
  gsm.print(APN);
  gsm.println("\"");
  delay(2000);
  readGSM();

  wdt_reset();
  gsm.println("AT+SAPBR=1,1");
  delay(7000); // Daha uzun bekle (5'ten 7'ye)
  readGSM();

  wdt_reset();
  gsm.println("AT+SAPBR=2,1");
  delay(2000);
  readGSM();

  Serial.println(F("GSM hazir!"));
}

bool httpPost(int level) {
  Serial.println(F("Gonderiliyor..."));

  wdt_reset();

  // HTTP oturumu başlat
  gsm.println("AT+HTTPTERM"); // Önce eski oturumu kapat
  delay(500);
  readGSM();

  sendCmd("AT+HTTPINIT");
  sendCmd("AT+HTTPPARA=\"CID\",1");

  // URL (char buffer - bellek dostu)
  gsm.print(F("AT+HTTPPARA=\"URL\",\"http://"));
  gsm.print(HOST);
  gsm.println(F("/api/telemetry\""));
  delay(1000);
  readGSM();

  wdt_reset();

  sendCmd("AT+HTTPPARA=\"CONTENT\",\"application/json\"");

  // JSON (char buffer - bellek dostu)
  char json[64];
  sprintf(json, "{\"tank_level\":%d,\"device_id\":\"%s\"}", level, DEVICE_ID);

  gsm.print(F("AT+HTTPDATA="));
  gsm.print(strlen(json));
  gsm.println(F(",10000"));
  delay(500);
  readGSM();

  gsm.print(json);
  delay(2000);
  readGSM();

  wdt_reset();

  // POST gönder
  gsm.println("AT+HTTPACTION=1");

  // 15 saniye bekle ama WDT'yi besle (5+5+5 saniye)
  delay(5000);
  wdt_reset();
  delay(5000);
  wdt_reset();
  delay(5000);
  wdt_reset();

  // Yanıtı oku ve başarı kontrolü yap
  String response = readGSMString();
  bool success = (response.indexOf("200") > -1 || response.indexOf("201") > -1);

  wdt_reset();

  sendCmd("AT+HTTPREAD");
  sendCmd("AT+HTTPTERM");

  return success;
}

void sendCmd(const char *cmd) {
  gsm.println(cmd);
  delay(2000);
  readGSM();
}

void readGSM() {
  while (gsm.available()) {
    Serial.write(gsm.read());
  }
}

String readGSMString() {
  String response = "";
  unsigned long start = millis();
  while (millis() - start < 3000) {
    if (gsm.available()) {
      char c = gsm.read();
      response += c;
      Serial.write(c);
    }
  }
  return response;
}
