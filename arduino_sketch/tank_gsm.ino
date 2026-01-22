/*
  Tank Seviye + SIM900 + Watchdog Timer
  Lightsail Proxy uzerinden AWS'ye gonderim
  WDT: Sistem takilirsa 8 saniyede otomatik reset
*/

#include <SoftwareSerial.h>
#include <avr/wdt.h> // Watchdog Timer kütüphanesi

SoftwareSerial gsm(7, 8);

// Lightsail Proxy (HTTP - port 80)
const char *HOST = "63.181.47.189";

// Kalibrasyon
const int RAW_EMPTY = 10;
const int RAW_FULL = 1042;

// Hata sayacı
int errorCount = 0;
const int MAX_ERRORS = 3;

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

  // 1 dakika bekle (10 saniyede bir watchdog besle)
  for (int i = 0; i < 6; i++) {
    delay(10000); // 10 saniye
    wdt_reset();  // Watchdog'u besle
  }
}

void initGSM() {
  Serial.println(F("GSM baslatiliyor..."));

  wdt_reset();
  sendCmd("AT");
  sendCmd("ATE0");
  sendCmd("AT+CSQ");

  // GPRS
  wdt_reset();
  sendCmd("AT+CGATT=1");
  sendCmd("AT+SAPBR=3,1,\"CONTYPE\",\"GPRS\"");
  sendCmd("AT+SAPBR=3,1,\"APN\",\"internet\"");

  wdt_reset();
  gsm.println("AT+SAPBR=1,1");
  delay(5000);
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

  // URL
  String url = "http://";
  url += HOST;
  url += "/api/telemetry";

  gsm.print("AT+HTTPPARA=\"URL\",\"");
  gsm.print(url);
  gsm.println("\"");
  delay(1000);
  readGSM();

  wdt_reset();

  sendCmd("AT+HTTPPARA=\"CONTENT\",\"application/json\"");

  // JSON
  String json = "{\"tank_level\":";
  json += level;
  json += ",\"device_id\":\"1-aktup\"}";

  gsm.print("AT+HTTPDATA=");
  gsm.print(json.length());
  gsm.println(",10000");
  delay(500);
  readGSM();

  gsm.print(json);
  delay(2000);
  readGSM();

  wdt_reset();

  // POST gönder
  gsm.println("AT+HTTPACTION=1");
  delay(10000);

  // Yanıtı oku ve başarı kontrolü yap
  String response = readGSMString();
  bool success = (response.indexOf("200") > -1);

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
