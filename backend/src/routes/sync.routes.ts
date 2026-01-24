import { Router } from 'express';
import { EpdkService } from '../services/epdk.service';
import { authenticate, requireAdmin } from '../middleware/auth.middleware';

const router = Router();
const epdkService = new EpdkService();

// EPDK Sync (Admin only - sensitive operation)
router.post('/epdk', authenticate, requireAdmin, async (req, res) => {
    try {
        const result = await epdkService.syncDealers();
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: 'Sync failed', details: error });
    }
});

export default router;
