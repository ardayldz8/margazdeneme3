#include <SoftwareSerial.h>

// --- Pin Definitions ---
SoftwareSerial mySerial(7, 8); // RX, TX

// Denenecek hızlar
long baudRates[] = {9600, 19200, 38400, 57600, 115200};
int numBaudRates = 5;

void setup() {
  // Bilgisayar bağlantısı (Sonuçları görmek için)
  Serial.begin(9600);
  while (!Serial); // USB bağlanana kadar bekle

  Serial.println("\n--- SIM900 Otomatik Baud Rate Tarayici ---");
  Serial.println("Lutfen bekleyin, hizlar taraniyor...");
  Serial.println("------------------------------------------");

  bool found = false;

  for (int i = 0; i < numBaudRates; i++) {
    long rate = baudRates[i];
    Serial.print("Deneniyor: ");
    Serial.print(rate);
    Serial.print("... ");

    // O hızı başlat
    mySerial.begin(rate);
    delay(500); // Portun açılması için bekle

    // AT komutu gönder (Auto-baud için birkaç kez)
    // SIM900 bazen ilk komutta uyanmaz, o yüzden 5 kere deniyoruz
    for (int j = 0; j < 5; j++) {
      while(mySerial.available()) mySerial.read(); // Buffer'ı temizle
      
      mySerial.println("AT");
      delay(500); // Cevap için bekle

      if (mySerial.available()) {
        String response = mySerial.readString();
        // Cevap geldiyse (OK veya başka bir şey)
        if (response.length() > 1) { // Boşluk değilse
           Serial.println("BASARILI! [OK]");
           Serial.println("------------------------------------------------");
           Serial.print(">>> BULUNAN BAUD RATE: ");
           Serial.println(rate);
           Serial.println(">>> Modulden Gelen Cevap: " + response);
           Serial.println("------------------------------------------------");
           found = true;
           break;
        }
      }
    }

    if (found) break; // Bulduysak döngüden çık
    
    Serial.println("Cevap Yok.");
    mySerial.end(); // Portu kapat
    delay(500);
  }

  if (!found) {
    Serial.println("\n--- SONUC: Hicbir hizda cevap alinamadi ---");
    Serial.println("Olasiliklar:");
    Serial.println("1. Jumperlar yanlis yerde (D7/D8 olmali)");
    Serial.println("2. Modulun gucu kapali (Isiklar yaniyor mu?)");
    Serial.println("3. Kablolar gevsek");
  }
}

void loop() {
  // İşimiz bitti, bekliyoruz
}
