/*
  SIM900 HTTP Test
  httpbin.org ile test (gercek HTTP)
*/

#include <SoftwareSerial.h>
SoftwareSerial gsm(7, 8);

void setup() {
  Serial.begin(9600);
  gsm.begin(9600);

  Serial.println("HTTP Test Basliyor...");
  delay(3000);

  sendCmd("AT");
  sendCmd("ATE0");
  sendCmd("AT+CSQ");

  // GPRS
  sendCmd("AT+CGATT=1");
  sendCmd("AT+SAPBR=3,1,\"CONTYPE\",\"GPRS\"");
  sendCmd("AT+SAPBR=3,1,\"APN\",\"internet\"");
  sendCmd("AT+SAPBR=1,1");
  delay(3000);

  // IP al
  sendCmd("AT+SAPBR=2,1");

  // HTTP test - httpbin.org (gercek HTTP destekler)
  sendCmd("AT+HTTPINIT");
  sendCmd("AT+HTTPPARA=\"CID\",1");
  sendCmd("AT+HTTPPARA=\"URL\",\"http://httpbin.org/post\"");
  sendCmd("AT+HTTPPARA=\"CONTENT\",\"application/json\"");

  // Data
  gsm.println("AT+HTTPDATA=25,10000");
  delay(500);
  readGSM();
  gsm.print("{\"test\":\"merhaba\"}");
  delay(2000);
  readGSM();

  // POST
  Serial.println("\nPOST gonderiliyor...");
  gsm.println("AT+HTTPACTION=1");
  delay(10000);
  readGSM();

  // Sonuc
  sendCmd("AT+HTTPREAD");
  sendCmd("AT+HTTPTERM");

  Serial.println("\nTest bitti!");
}

void loop() {}

void sendCmd(const char *cmd) {
  Serial.print("> ");
  Serial.println(cmd);
  gsm.println(cmd);
  delay(2000);
  readGSM();
}

void readGSM() {
  while (gsm.available()) {
    Serial.write(gsm.read());
  }
  Serial.println();
}
