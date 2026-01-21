/*
  SIM900 Shield - Hardware Serial Test
  -------------------------------------
  ONEMLI: Kodu yuklerken shield'i Arduino'dan CIKAR!
  Yukledikten sonra shield'i tak ve RESET'e bas.

  Jumper pozisyonu: D0/D1 (Hardware Serial)
*/

#include <SoftwareSerial.h> // This include is no longer needed but kept as per instruction to not make unrelated edits unless explicitly removed.

// SIM900 Shield pinleri (cogu shield 7/8 kullanir)
// #define GSM_TX 7 // Arduino TX -> SIM900 RX - No longer needed for Hardware
// Serial #define GSM_RX 8 // Arduino RX <- SIM900 TX - No longer needed for
// Hardware Serial

// SoftwareSerial gsm(GSM_RX, GSM_TX); // RX, TX - No longer needed for Hardware
// Serial

void setup() {
  Serial.begin(9600); // USB ve SIM900 ayni seri portu paylaniyor

  delay(3000);
  Serial.println("SIM900 TEST - Hardware Serial");
  Serial.println("==============================");

  // Modul acik mi test et
  Serial.println("AT");
  delay(1000);

  Serial.println();

  delay(3000); // Modul acilmasi icin bekle

  // Temel test
  Serial.println(">> Temel baglanti testi...");
  sendAT("AT", 2000);

  // Echo kapat
  sendAT("ATE0", 1000);

  // Modul bilgisi
  Serial.println("\n>> Modul Bilgisi:");
  sendAT("ATI", 2000);

  // IMEI
  Serial.println("\n>> IMEI:");
  sendAT("AT+CGSN", 2000);

  // SIM Durumu
  Serial.println("\n>> SIM Durumu:");
  sendAT("AT+CPIN?", 2000);

  // Sinyal Kalitesi (0-31, 10+ iyi, 20+ mukemmel)
  Serial.println("\n>> Sinyal Kalitesi:");
  sendAT("AT+CSQ", 2000);

  // Network Kayit Durumu
  Serial.println("\n>> Network Kayit:");
  sendAT("AT+CREG?", 2000);

  // Operator
  Serial.println("\n>> Operator:");
  sendAT("AT+COPS?", 3000);

  // GPRS Baglanti
  Serial.println("\n>> GPRS Durumu:");
  sendAT("AT+CGATT?", 2000);

  Serial.println("\n================================");
  Serial.println("   TEST TAMAMLANDI");
  Serial.println("================================");
  Serial.println("\nSimdi seri monitor'den AT komutlari gonderebilirsin.");
}

void loop() {
  // Seri monitorden gelen komutlari GSM'e gonder
  if (Serial.available()) {
    String cmd = Serial.readStringUntil('\n');
    cmd.trim();
    if (cmd.length() > 0) {
      Serial.print("\n>> Gonderilen: ");
      Serial.println(cmd);
      sendAT(cmd.c_str(), 3000);
    }
  }

  // GSM'den gelen veriyi seri monitore yazdir
  while (gsm.available()) {
    Serial.write(gsm.read());
  }
}

// AT komutu gonder ve cevabi bekle
void sendAT(const char *cmd, int timeout) {
  gsm.println(cmd);

  long start = millis();
  String response = "";

  while (millis() - start < timeout) {
    while (gsm.available()) {
      char c = gsm.read();
      response += c;
      Serial.write(c);
    }

    if (response.indexOf("OK") >= 0 || response.indexOf("ERROR") >= 0) {
      break;
    }
  }

  if (response.length() == 0) {
    Serial.println("[CEVAP YOK - Baglanti kontrol et!]");
  }

  delay(100);
}
