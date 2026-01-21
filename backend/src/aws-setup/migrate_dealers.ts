
import { PrismaClient } from '@prisma/client';
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load env from backend root
dotenv.config({ path: path.join(__dirname, '../../.env') });

const prisma = new PrismaClient();
const client = new DynamoDBClient({ region: process.env.AWS_REGION || "eu-north-1" });
const docClient = DynamoDBDocumentClient.from(client);

async function migrate() {
    console.log("🚀 Starting migration from Local SQLite to AWS DynamoDB...");

    try {
        // 1. Fetch all dealers from local DB
        const dealers = await prisma.dealer.findMany();
        console.log(`📦 Found ${dealers.length} dealers in local database.`);

        if (dealers.length === 0) {
            console.log("⚠️ No dealers found. Creating a DEMO dealer...");
            const demoDealer = await prisma.dealer.create({
                data: {
                    licenseNo: 'DEMO_AWS_001',
                    title: 'AWS Demo İstasyonu',
                    city: 'Istanbul',
                    district: 'Merkez',
                    tankLevel: 25,
                    lastData: new Date()
                }
            });
            dealers.push(demoDealer);
            console.log("✅ Created Demo Dealer.");
        }

        // 2. Upload to DynamoDB
        let successCount = 0;
        let failCount = 0;

        for (const dealer of dealers) {
            // Convert Dates to ISO strings for DynamoDB
            const item = {
                ...dealer,
                startDate: dealer.startDate?.toISOString(),
                endDate: dealer.endDate?.toISOString(),
                contractStartDate: dealer.contractStartDate?.toISOString(),
                contractEndDate: dealer.contractEndDate?.toISOString(),
                lastData: dealer.lastData?.toISOString(),
                createdAt: dealer.createdAt.toISOString(),
                updatedAt: dealer.updatedAt.toISOString(),
                // Ensure numbers are numbers
                latitude: dealer.latitude,
                longitude: dealer.longitude,
                tankLevel: dealer.tankLevel
            };

            try {
                await docClient.send(new PutCommand({
                    TableName: "MargazDealers",
                    Item: item
                }));
                process.stdout.write("."); // Progress indicator
                successCount++;
            } catch (err: any) {
                console.error(`\n❌ Failed to upload dealer ${dealer.title}:`, err.message);
                failCount++;
            }
        }

        console.log("\n\n---------------------------------------------------");
        console.log(`✅ Migration Complete!`);
        console.log(`Uploaded: ${successCount}`);
        console.log(`Failed:   ${failCount}`);
        console.log("---------------------------------------------------");

    } catch (err: any) {
        console.error("❌ Error migrating dealers:", err);
        if (err.name === 'ResourceNotFoundException') {
            console.error("Please ensure the 'MargazDealers' DynamoDB table exists and is correctly configured.");
        }
    } finally {
        await prisma.$disconnect();
    }
}

migrate();
