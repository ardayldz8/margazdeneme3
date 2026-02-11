-- CreateTable
CREATE TABLE "DeviceAuth" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "deviceId" TEXT NOT NULL,
    "authMode" TEXT NOT NULL DEFAULT 'signed',
    "secret" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "DeviceAuth_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "Device" ("deviceId") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "DeviceAuth_deviceId_key" ON "DeviceAuth"("deviceId");

-- CreateIndex
CREATE INDEX "DeviceAuth_authMode_active_idx" ON "DeviceAuth"("authMode", "active");
