// Netlify Function: API Proxy to Lightsail
export default async (request, context) => {
    const LIGHTSAIL_URL = 'http://63.181.47.189';

    // Get the path after /api
    const url = new URL(request.url);
    const apiPath = url.pathname.replace('/api', '/api');
    const targetUrl = `${LIGHTSAIL_URL}${apiPath}${url.search}`;

    try {
        // Forward the request
        const response = await fetch(targetUrl, {
            method: request.method,
            headers: {
                'Content-Type': 'application/json',
            },
            body: request.method !== 'GET' && request.method !== 'HEAD'
                ? await request.text()
                : undefined,
        });

        const data = await response.text();

        return new Response(data, {
            status: response.status,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
            },
        });
    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
};

export const config = {
    path: "/api/*"
};
