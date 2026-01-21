import { SerialPort } from 'serialport';
import { ReadlineParser } from '@serialport/parser-readline';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class SerialService {
    private port: SerialPort | null = null;
    private parser: ReadlineParser | null = null;
    private isConnected: boolean = false;

    constructor() {
        // Disable SerialService in Cloud (Render) environment
        if (process.env.RENDER || process.env.NODE_ENV === 'production') {
            console.log('☁️ Running in Cloud Environment. SerialService disabled.');
            return;
        }
        this.initialize();
    }

    private async initialize() {
        try {
            // Auto-detect Arduino
            const ports = await SerialPort.list();

            // FILTER: Prioritize COM8 (CH340) as detected, then look for Arduino/USB/wch.cn
            const arduinoPort = ports.find(p => p.path === 'COM8') ||
                ports.find(p => p.manufacturer?.includes('Arduino') || p.path.includes('USB') || p.manufacturer?.includes('wch.cn'));

            if (!arduinoPort) {
                console.log('No Arduino found. Retrying in 5s...');
                setTimeout(() => this.initialize(), 5000);
                return;
            }

            console.log(`Attempting to connect to ${arduinoPort.path}...`);

            this.port = new SerialPort({
                path: arduinoPort.path,
                baudRate: 9600,
                autoOpen: false,
            });

            this.parser = this.port.pipe(new ReadlineParser({ delimiter: '\r\n' }));

            this.port.open((err) => {
                if (err) {
                    console.error(`Error opening serial port: ${err.message}. Retrying in 5s...`);
                    setTimeout(() => this.initialize(), 5000);
                    return;
                }
                console.log(`Serial port ${arduinoPort.path} opened successfully.`);
                this.isConnected = true;
            });

            this.parser.on('data', this.handleData.bind(this));
            this.port.on('error', (err) => {
                console.error('Serial port error:', err);
                this.isConnected = false;
                // Attempt reconnect on error
                setTimeout(() => this.initialize(), 5000);
            });
            this.port.on('close', () => {
                console.log('Serial port closed. Reconnecting...');
                this.isConnected = false;
                setTimeout(() => this.initialize(), 5000);
            });

        } catch (error) {
            console.error('Failed to initialize SerialService:', error);
            setTimeout(() => this.initialize(), 5000);
        }
    }

    private async handleData(data: string) {
        try {
            // Expected format: {"level": 45}
            const cleanData = data.trim();
            if (!cleanData.startsWith('{') || !cleanData.endsWith('}')) return;

            const parsed = JSON.parse(cleanData);

            if (typeof parsed.tankLevel === 'number') {
                console.log(`Arduino Data Received: Level ${parsed.tankLevel}%`);

                // Update database
                await prisma.dealer.update({
                    where: { licenseNo: 'ARDUINO_001' },
                    data: {
                        tankLevel: parsed.tankLevel,
                        lastData: new Date()
                    }
                });
            }
        } catch (error) {
            console.error('Error parsing serial data:', error);
        }
    }
}
