// =====================================================
// Rochester Hall Effect Tank Sensor - Arduino Code
// =====================================================
// Sensor: Rochester Hall Effect (0.5V - 4.5V output)
// Power: 8-32V DC (sensor), 5V (Arduino)
// ONEMLI: GND ortak olmali!
// =====================================================

#define SENSOR_PIN A0

// KALIBRE EDILDI: Raw 350 = %80 (GVL okumasi)
const int RAW_EMPTY = 130; // 0% (Bos tank)
const int RAW_FULL = 400;  // 100% (Dolu tank)

// Smoothing (gurultu filtreleme)""
const int NUM_SAMPLES = 10;
int readings[NUM_SAMPLES];
int readIndex = 0;
long total = 0;

void setup() {
  Serial.begin(9600);

  Serial.println(F("========================================"));
  Serial.println(F("  Rochester Hall Effect Sensor Test"));
  Serial.println(F("========================================"));
  Serial.println(F(""));
  Serial.println(F("Kalibrasyon degerleri:"));
  Serial.print(F("  Bos (0.5V): "));
  Serial.println(RAW_EMPTY);
  Serial.print(F("  Dolu (4.5V): "));
  Serial.println(RAW_FULL);
  Serial.println(F(""));
  Serial.println(F("Eger degerler yanlis ise, RAW_EMPTY ve RAW_FULL"));
  Serial.println(F("sabitlerini gercek degerlere gore ayarla."));
  Serial.println(F("========================================"));
  Serial.println(F(""));

  // Initialize readings array
  for (int i = 0; i < NUM_SAMPLES; i++) {
    readings[i] = 0;
  }

  delay(2000);
}

void loop() {
  // Read raw value
  int rawValue = analogRead(SENSOR_PIN);

  // Smoothing: moving average
  total = total - readings[readIndex];
  readings[readIndex] = rawValue;
  total = total + readings[readIndex];
  readIndex = (readIndex + 1) % NUM_SAMPLES;

  int smoothedValue = total / NUM_SAMPLES;

  // Calculate voltage (for debugging)
  float voltage = (smoothedValue / 1023.0) * 5.0;

  // Map to percentage
  // Sensor: 0.5V (empty) to 4.5V (full)
  int tankLevel = map(smoothedValue, RAW_EMPTY, RAW_FULL, 0, 100);
  tankLevel = constrain(tankLevel, 0, 100);

  // Print debug info
  Serial.print(F("Raw: "));
  Serial.print(rawValue);
  Serial.print(F(" | Smooth: "));
  Serial.print(smoothedValue);
  Serial.print(F(" | Volt: "));
  Serial.print(voltage, 2);
  Serial.print(F("V | Tank: %"));
  Serial.print(tankLevel);

  // Visual bar
  Serial.print(F(" |"));
  int barLen = tankLevel / 5;
  for (int i = 0; i < 20; i++) {
    Serial.print(i < barLen ? "#" : "-");
  }
  Serial.print(F("|"));

  // Warnings
  if (smoothedValue < 50) {
    Serial.print(F(" << SINYAL YOK! GND bagla!"));
  } else if (smoothedValue < RAW_EMPTY - 20) {
    Serial.print(F(" << 0.5V altinda, sensor kontrol et"));
  } else if (smoothedValue > RAW_FULL + 20) {
    Serial.print(F(" << 4.5V ustunde, voltaj cok yuksek!"));
  }

  Serial.println();

  delay(500);
}
