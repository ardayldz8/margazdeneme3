/*
  Margaz Tank Level Simulator
  Reads a potentiometer on Pin A0 and sends JSON data over Serial.
*/

const int POT_PIN = A0;
unsigned long lastSendTime = 0;
const int INTERVAL = 1000; // Send data every 1 second

void setup() {
  Serial.begin(9600); // Must match backend baud rate
}

void loop() {
  if (millis() - lastSendTime > INTERVAL) {
    lastSendTime = millis();
    
    // Read potentiometer (0-1023)
    int sensorValue = analogRead(POT_PIN);
    
    // Map to percentage (0-100)
    int level = map(sensorValue, 0, 1023, 0, 100);
    
    // Send JSON format: {"level": 45}
    Serial.print("{\"level\": ");
    Serial.print(level);
    Serial.println("}");
  }
}
