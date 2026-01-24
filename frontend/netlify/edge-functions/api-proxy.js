// Netlify Function: API Proxy to Lightsail
// Set BACKEND_URL in Netlify Environment Variables (Site Settings > Environment Variables)
// 
// IMPORTANT: Configure these in Netlify:
// - BACKEND_URL: https://api.yourdomain.com (use HTTPS when SSL is configured)
// - ALLOWED_ORIGINS: https://margaz.netlify.app (comma-separated if multiple)

export default async (request, context) => {
    // Use environment variable, fallback to production URL
    const BACKEND_URL = Deno.env.get('BACKEND_URL') || 'http://63.181.47.189';
    
    // Get allowed origins from env or default
    const allowedOriginsStr = Deno.env.get('ALLOWED_ORIGINS') || 'https://margaz.netlify.app';
    const allowedOrigins = allowedOriginsStr.split(',').map(o => o.trim());
    
    // Get request origin
    const origin = request.headers.get('Origin') || '';
    const allowOrigin = allowedOrigins.includes(origin) ? origin : allowedOrigins[0];

    // Security headers
    const securityHeaders = {
        'Access-Control-Allow-Origin': allowOrigin,
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Credentials': 'true',
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
    };

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
        return new Response(null, {
            status: 204,
            headers: securityHeaders,
        });
    }

    // Get the path after /api
    const url = new URL(request.url);
    const apiPath = url.pathname.replace('/api', '/api');
    const targetUrl = `${BACKEND_URL}${apiPath}${url.search}`;

    try {
        // Forward headers including Authorization
        const headers = {
            'Content-Type': 'application/json',
        };
        
        // Pass through Authorization header if present
        const authHeader = request.headers.get('Authorization');
        if (authHeader) {
            headers['Authorization'] = authHeader;
        }

        // Forward the request
        const response = await fetch(targetUrl, {
            method: request.method,
            headers,
            body: request.method !== 'GET' && request.method !== 'HEAD'
                ? await request.text()
                : undefined,
        });

        const data = await response.text();

        return new Response(data, {
            status: response.status,
            headers: {
                'Content-Type': 'application/json',
                ...securityHeaders,
            },
        });
    } catch (error) {
        console.error('Proxy error:', error);
        return new Response(JSON.stringify({ error: 'Backend connection failed' }), {
            status: 502,
            headers: { 
                'Content-Type': 'application/json',
                ...securityHeaders,
            },
        });
    }
};

export const config = {
    path: "/api/*"
};
