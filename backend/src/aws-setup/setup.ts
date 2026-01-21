import { DynamoDBClient, CreateTableCommand, ResourceInUseException } from "@aws-sdk/client-dynamodb";
import { IAMClient, CreateRoleCommand, AttachRolePolicyCommand, GetRoleCommand } from "@aws-sdk/client-iam";
import { LambdaClient, CreateFunctionCommand, UpdateFunctionCodeCommand, GetFunctionCommand, ResourceConflictException } from "@aws-sdk/client-lambda";
import { ApiGatewayV2Client, CreateApiCommand, CreateIntegrationCommand, CreateRouteCommand, CreateStageCommand, GetApiCommand } from "@aws-sdk/client-apigatewayv2";
import * as fs from 'fs';
import * as path from 'path';
import archiver from 'archiver';
import dotenv from 'dotenv';

dotenv.config();

const REGION = process.env.AWS_REGION || "eu-north-1";

const dynamoClient = new DynamoDBClient({ region: REGION });
const iamClient = new IAMClient({ region: REGION });
const lambdaClient = new LambdaClient({ region: REGION });
const apigwClient = new ApiGatewayV2Client({ region: REGION });

const TABLE_NAME = "MargazTelemetry";
const ROLE_NAME = "MargazLambdaRole";
const FUNCTION_NAME = "MargazIngest";
const API_NAME = "MargazAPI";

async function zipLambda() {
    return new Promise<Buffer>((resolve, reject) => {
        const archive = archiver('zip', { zlib: { level: 9 } });
        const chunks: Buffer[] = [];

        archive.on('data', (chunk) => chunks.push(chunk));
        archive.on('end', () => resolve(Buffer.concat(chunks)));
        archive.on('error', (err) => reject(err));

        archive.file(path.join(__dirname, 'lambda', 'index.js'), { name: 'index.js' });
        archive.finalize();
    });
}

async function setup() {
    console.log("🚀 Starting AWS Setup...");

    // 1. Create DynamoDB Table
    try {
        console.log(`Creating DynamoDB table: ${TABLE_NAME}...`);
        await dynamoClient.send(new CreateTableCommand({
            TableName: TABLE_NAME,
            KeySchema: [
                { AttributeName: "device_id", KeyType: "HASH" },
                { AttributeName: "timestamp", KeyType: "RANGE" }
            ],
            AttributeDefinitions: [
                { AttributeName: "device_id", AttributeType: "S" },
                { AttributeName: "timestamp", AttributeType: "N" }
            ],
            BillingMode: "PAY_PER_REQUEST"
        }));
        console.log("✅ DynamoDB table created.");
    } catch (err: any) {
        if (err instanceof ResourceInUseException) {
            console.log("⚠️ DynamoDB table already exists.");
        } else {
            console.error("❌ Error creating DynamoDB table:", err);
        }
    }

    // 2. Create IAM Role
    let roleArn = "";
    try {
        console.log(`Creating IAM Role: ${ROLE_NAME}...`);
        const assumeRolePolicy = {
            Version: "2012-10-17",
            Statement: [{
                Effect: "Allow",
                Principal: { Service: "lambda.amazonaws.com" },
                Action: "sts:AssumeRole"
            }]
        };

        const role = await iamClient.send(new CreateRoleCommand({
            RoleName: ROLE_NAME,
            AssumeRolePolicyDocument: JSON.stringify(assumeRolePolicy)
        }));
        roleArn = role.Role!.Arn!;

        // Attach policies
        await iamClient.send(new AttachRolePolicyCommand({
            RoleName: ROLE_NAME,
            PolicyArn: "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
        }));
        await iamClient.send(new AttachRolePolicyCommand({
            RoleName: ROLE_NAME,
            PolicyArn: "arn:aws:iam::aws:policy/AmazonDynamoDBFullAccess"
        }));

        console.log("✅ IAM Role created. Waiting for propagation...");
        await new Promise(r => setTimeout(r, 10000)); // Wait for role to propagate
    } catch (err: any) {
        if (err.name === 'EntityAlreadyExists' || err.name === 'EntityAlreadyExistsException') {
            console.log("⚠️ IAM Role already exists.");
            const role = await iamClient.send(new GetRoleCommand({ RoleName: ROLE_NAME }));
            roleArn = role.Role!.Arn!;
        } else {
            console.error("❌ Error creating IAM Role:", err);
            return;
        }
    }

    // 3. Create/Update Lambda Function
    let functionArn = "";
    try {
        console.log(`Deploying Lambda Function: ${FUNCTION_NAME}...`);
        const zipBuffer = await zipLambda();

        try {
            const func = await lambdaClient.send(new CreateFunctionCommand({
                FunctionName: FUNCTION_NAME,
                Runtime: "nodejs18.x",
                Role: roleArn,
                Handler: "index.handler",
                Code: { ZipFile: zipBuffer },
                Timeout: 10
            }));
            functionArn = func.FunctionArn!;
            console.log("✅ Lambda Function created.");
        } catch (err: any) {
            if (err instanceof ResourceConflictException) {
                console.log("⚠️ Lambda Function exists. Updating code...");
                const func = await lambdaClient.send(new UpdateFunctionCodeCommand({
                    FunctionName: FUNCTION_NAME,
                    ZipFile: zipBuffer
                }));
                functionArn = func.FunctionArn!;
                console.log("✅ Lambda Code updated.");
            } else {
                throw err;
            }
        }
    } catch (err) {
        console.error("❌ Error deploying Lambda:", err);
        return;
    }

    // 4. Create API Gateway (HTTP API)
    try {
        console.log(`Setting up API Gateway: ${API_NAME}...`);

        // Check if exists (simple check by listing not implemented for brevity, assuming create or error)
        // For simplicity in this script, we'll try to create. If we wanted to be idempotent we'd list APIs.

        const api = await apigwClient.send(new CreateApiCommand({
            Name: API_NAME,
            ProtocolType: "HTTP",
            Target: functionArn
        }));

        const apiId = api.ApiId;
        const endpoint = api.ApiEndpoint;

        // Add permission for API Gateway to invoke Lambda
        try {
            const accountId = roleArn.split(':')[4];
            const { AddPermissionCommand } = require("@aws-sdk/client-lambda");
            await lambdaClient.send(new AddPermissionCommand({
                FunctionName: FUNCTION_NAME,
                StatementId: `apigateway-invoke-${apiId}`,
                Action: "lambda:InvokeFunction",
                Principal: "apigateway.amazonaws.com",
                SourceArn: `arn:aws:execute-api:${REGION}:${accountId}:${apiId}/*/*`
            }));
        } catch (e: any) {
            if (e.name !== 'ResourceConflictException') console.error("Warning adding permission:", e);
        }

        console.log("✅ API Gateway created.");
        console.log("---------------------------------------------------");
        console.log("🎉 SETUP COMPLETE!");
        console.log("---------------------------------------------------");
        console.log(`🌍 API URL: ${endpoint}`);
        console.log("---------------------------------------------------");
        console.log("Use this URL in your Arduino code.");

    } catch (err) {
        console.error("❌ Error setting up API Gateway:", err);
    }
}

setup();
