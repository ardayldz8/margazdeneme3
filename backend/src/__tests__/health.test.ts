import request from 'supertest';
import app from '../app';

describe('Health Check Endpoint', () => {
    it('should return 200 and status ok', async () => {
        const response = await request(app)
            .get('/health')
            .expect(200);

        expect(response.body).toHaveProperty('status', 'ok');
        expect(response.body).toHaveProperty('timestamp');
        expect(response.body).toHaveProperty('version');
        expect(response.body.version).toBe('1.1.0');
    });

    it('should return valid ISO timestamp', async () => {
        const response = await request(app)
            .get('/health')
            .expect(200);

        const timestamp = response.body.timestamp;
        expect(new Date(timestamp).toISOString()).toBe(timestamp);
    });
});
