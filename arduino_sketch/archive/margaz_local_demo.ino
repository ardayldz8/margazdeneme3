#include <SoftwareSerial.h>

// --- Pin Definitions ---
const int POT_PIN = A0;

// Nextion: RX=2, TX=3 (Sadece Gonderme yapacagiz)
SoftwareSerial nextion(2, 3);

// SIM900: RX=7, TX=8 (Hem Gonderme Hem Alma)
SoftwareSerial sim900(7, 8);

// --- Constants ---
const int UPDATE_INTERVAL = 300;            // Ekran guncelleme hizi
const unsigned long CLOUD_INTERVAL = 10000; // Buluta gonderme hizi (10 saniye)

unsigned long lastUpdate = 0;
unsigned long lastCloudTime = 0;
int lastPercentage = -1;

// Render Backend URL (HTTP - SIM900 icin SSL yok)
String apiUrl = "http://margaz-backend.onrender.com/api/telemetry";

void setup() {
  // 1. USB Serial (Debug icin)
  Serial.begin(9600);
  Serial.println("Sistem Baslatiliyor...");

  // 2. Nextion Baslat
  nextion.begin(9600);

  // 3. SIM900 Baslat
  sim900.begin(9600);
  sim900.listen(); // SIM900'u dinlemeye basla

  delay(1000);

  // GPRS Hazirlik
  setupGPRS();
}

void loop() {
  unsigned long currentMillis = millis();

  // --- 1. EKRAN GUNCELLEME ---
  if (currentMillis - lastUpdate > UPDATE_INTERVAL) {
    lastUpdate = currentMillis;

    int sensorValue = analogRead(POT_PIN);
    int percentage = map(sensorValue, 0, 1023, 0, 100);
    percentage = constrain(percentage, 0, 100);

    if (percentage != lastPercentage) {
      updateNextion(percentage);
      lastPercentage = percentage;
    }
  }

  // --- 2. BULUTA GONDERME ---
  if (currentMillis - lastCloudTime > CLOUD_INTERVAL) {
    lastCloudTime = currentMillis;
    sendToCloud(lastPercentage);
  }
}

void updateNextion(int val) {
  String statusText = "";
  if (val > lastPercentage)
    statusText = "Dolum %";
  else if (val < lastPercentage)
    statusText = "Bosaltim %";
  else
    statusText = "Seviye %";

  // Bar Guncelle
  nextion.print("j0.val=");
  nextion.print(val);
  nextion.write(0xff);
  nextion.write(0xff);
  nextion.write(0xff);

  // Yazi Guncelle
  nextion.print("t0.txt=\"");
  nextion.print(statusText);
  nextion.print(val);
  nextion.print("\"");
  nextion.write(0xff);
  nextion.write(0xff);
  nextion.write(0xff);
}

void setupGPRS() {
  Serial.println("GPRS Ayarlaniyor...");

  // Onceki oturumlari kapat
  sendAT("AT+HTTPTERM", 2000);
  sendAT("AT+SAPBR=0,1", 2000);

  // Yeni baglanti
  sendAT("AT+SAPBR=3,1,\"Contype\",\"GPRS\"", 1000);
  sendAT("AT+SAPBR=3,1,\"APN\",\"internet\"", 1000);

  // DNS Komutlarini kaldirdim (Modul desteklemiyor)

  sendAT("AT+SAPBR=1,1", 3000); // Baglanti acmak surer

  // IP Adresini Kontrol Et
  sendAT("AT+SAPBR=2,1", 1000);

  sendAT("AT+HTTPINIT", 1000);
  sendAT("AT+HTTPSSL=0", 1000); // SSL KAPALI (HTTP deniyoruz)
  sendAT("AT+HTTPPARA=\"CID\",1", 1000);
  Serial.println("GPRS Hazir!");
}

void sendToCloud(int val) {
  Serial.println("Buluta Gonderiliyor: " + String(val));

  String jsonData =
      "{\"device_id\":\"demo_unit\",\"tank_level\":" + String(val) +
      ",\"voltage\":12.5}";

  // URL Gonderimi (Buffer dolmasin diye okuyarak bekliyoruz)
  sendAT("AT+HTTPPARA=\"URL\",\"" + apiUrl + "\"", 2000);

  sendAT("AT+HTTPPARA=\"CONTENT\",\"application/json\"", 1000);

  // Veri Boyutu
  sendAT("AT+HTTPDATA=" + String(jsonData.length()) + ",10000", 1000);

  // Veriyi Gonder
  sim900.print(jsonData);
  // Veri giderken de okuyalim
  unsigned long start = millis();
  while (millis() - start < 1000) {
    while (sim900.available())
      Serial.write(sim900.read());
  }

  // POST Islemi
  // Cevap (+HTTPACTION: 1,200,0) gelene kadar bekleyelim (Max 10sn)
  sim900.println("AT+HTTPACTION=1");
  start = millis();
  while (millis() - start < 10000) {
    while (sim900.available()) {
      char c = sim900.read();
      Serial.write(c);
    }
  }
}

// YENI FONKSIYON: Beklerken okuma yapar (Buffer tasma sorununu cozer)
void sendAT(String command, unsigned long waitMs) {
  sim900.println(command);
  unsigned long start = millis();
  while (millis() - start < waitMs) {
    while (sim900.available()) {
      Serial.write(sim900.read());
    }
  }
}
