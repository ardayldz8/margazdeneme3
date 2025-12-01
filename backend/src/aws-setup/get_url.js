const { ApiGatewayV2Client, GetApisCommand } = require("@aws-sdk/client-apigatewayv2");
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '../../.env') });

const client = new ApiGatewayV2Client({ region: process.env.AWS_REGION || "eu-north-1" });

async function getUrl() {
    const command = new GetApisCommand({});
    const response = await client.send(command);
    const api = response.Items.find(item => item.Name === "MargazAPI");
    if (api) {
        console.log(`API URL: ${api.ApiEndpoint}`);
    } else {
        console.log("API not found");
    }
}

getUrl();
