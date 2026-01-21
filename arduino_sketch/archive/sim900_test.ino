/*
  SIM900 Shield Test
  ------------------
  Jumper: D7/D8 pozisyonunda olmali!
*/

#include <SoftwareSerial.h>

SoftwareSerial gsm(7, 8); // RX=7, TX=8

void setup() {
  Serial.begin(9600);
  gsm.begin(9600);

  Serial.println("SIM900 TEST BASLADI");
  Serial.println("===================");
  delay(2000);

  // AT test
  test("AT");
  test("ATI");
  test("AT+CPIN?");
  test("AT+CSQ");
  test("AT+CREG?");
  test("AT+COPS?");

  Serial.println("\n=== TEST BITTI ===");
  Serial.println("Asagiya AT komutu yazabilirsin:");
}

void loop() {
  // Kullanicidan komut al
  if (Serial.available()) {
    String cmd = Serial.readStringUntil('\n');
    gsm.println(cmd);
  }

  // GSM cevabini goster
  if (gsm.available()) {
    Serial.write(gsm.read());
  }
}

void test(String cmd) {
  Serial.print("\n>> ");
  Serial.println(cmd);

  gsm.println(cmd);
  delay(1000);

  bool got = false;
  while (gsm.available()) {
    Serial.write(gsm.read());
    got = true;
  }

  if (!got)
    Serial.println("[CEVAP YOK]");
}
