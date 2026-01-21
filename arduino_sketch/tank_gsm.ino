/*
  Tank Seviye + SIM900
  Cloudflare Worker uzerinden AWS'ye gonderim
*/

#include <SoftwareSerial.h>
SoftwareSerial gsm(7, 8);

// Lightsail Proxy (HTTP - port 80)
const char *HOST = "63.181.47.189";

// Kalibrasyon
const int RAW_EMPTY = 10;
const int RAW_FULL = 1042;

void setup() {
  Serial.begin(9600);
  gsm.begin(9600);

  Serial.println("Basliyor...");
  delay(3000);

  sendCmd("AT");
  sendCmd("ATE0");
  sendCmd("AT+CSQ");

  // GPRS
  sendCmd("AT+CGATT=1");
  sendCmd("AT+SAPBR=3,1,\"CONTYPE\",\"GPRS\"");
  sendCmd("AT+SAPBR=3,1,\"APN\",\"internet\"");
  sendCmd("AT+SAPBR=1,1");
  delay(2000);
  sendCmd("AT+SAPBR=2,1");

  Serial.println("Hazir!");
}

void loop() {
  int raw = analogRead(A0);
  int seviye = map(raw, RAW_EMPTY, RAW_FULL, 0, 100);
  seviye = constrain(seviye, 0, 100);

  Serial.print("Seviye: %");
  Serial.print(seviye);
  Serial.print(" (Raw:");
  Serial.print(raw);
  Serial.println(")");

  httpPost(seviye);

  delay(600000); // 10 dakika
}

void httpPost(int level) {
  Serial.println("Gonderiliyor...");

  sendCmd("AT+HTTPINIT");
  sendCmd("AT+HTTPPARA=\"CID\",1");

  // Cloudflare Worker URL
  String url = "http://";
  url += HOST;
  url += "/api/telemetry";

  gsm.print("AT+HTTPPARA=\"URL\",\"");
  gsm.print(url);
  gsm.println("\"");
  delay(1000);
  readGSM();

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

  // POST
  gsm.println("AT+HTTPACTION=1");
  delay(10000);
  readGSM();

  sendCmd("AT+HTTPREAD");
  sendCmd("AT+HTTPTERM");

  Serial.println("Gonderildi!");
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
