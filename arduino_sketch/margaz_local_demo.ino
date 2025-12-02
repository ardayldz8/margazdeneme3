#include <SoftwareSerial.h>

// --- Pin Definitions ---
const int POT_PIN = A0;
const int NEXTION_RX = 2;
const int NEXTION_TX = 3;

// --- Constants ---
const int UPDATE_INTERVAL = 200; // Update every 200ms
unsigned long lastUpdate = 0;

// --- Objects ---
SoftwareSerial nextion(NEXTION_RX, NEXTION_TX); // RX, TX

void setup() {
  // Initialize USB Serial (for Backend)
  Serial.begin(9600);
  
  // Initialize Nextion Serial
  nextion.begin(9600);
  
  // Wait for stability
  delay(1000);
  Serial.println("System Started");
}

void loop() {
  if (millis() - lastUpdate > UPDATE_INTERVAL) {
    lastUpdate = millis();
    
    // 1. Read Potentiometer
    int sensorValue = analogRead(POT_PIN);
    
    // 2. Map to Percentage (0-100)
    // Adjust 1023 if your pot doesn't reach full scale
    int percentage = map(sensorValue, 0, 1023, 0, 100);
    percentage = constrain(percentage, 0, 100); // Ensure 0-100 range
    
    // 3. Send to Nextion Display (Progress Bar j0)
    // Command format: "j0.val=50" followed by 3x 0xFF
    nextion.print("j0.val=");
    nextion.print(percentage);
    nextion.write(0xff);
    nextion.write(0xff);
    nextion.write(0xff);
    
    // Optional: Update a text number field if you have one (e.g., n0)
    // nextion.print("n0.val=");
    // nextion.print(percentage);
    // nextion.write(0xff);
    // nextion.write(0xff);
    // nextion.write(0xff);
    
    // 4. Send to Backend (USB Serial)
    // Format: {"tankLevel": 50}
    Serial.print("{\"tankLevel\": ");
    Serial.print(percentage);
    Serial.println("}");
  }
}
