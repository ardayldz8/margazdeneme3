/*
  HC-SR04 Sensor Test (SIM900 YOK)
  --------------------------------
  TRIG: A0
  ECHO: A1
*/

#define TRIG A0
#define ECHO A1

void setup() {
  Serial.begin(9600);
  pinMode(TRIG, OUTPUT);
  pinMode(ECHO, INPUT);
  Serial.println("HC-SR04 TEST");
}

void loop() {
  digitalWrite(TRIG, LOW);
  delayMicroseconds(2);
  digitalWrite(TRIG, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG, LOW);

  long sure = pulseIn(ECHO, HIGH, 30000);

  Serial.print("PulseIn: ");
  Serial.print(sure);
  Serial.print(" us | Mesafe: ");
  Serial.print(sure * 0.034 / 2);
  Serial.println(" cm");

  delay(500);
}
