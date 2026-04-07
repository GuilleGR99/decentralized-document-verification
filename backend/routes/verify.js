import express from 'express';
import { existsInIPFS } from '../services/ipfsService.js';

const router = express.Router();

router.get('/:cid', async (req, res) => {
    const { cid } = req.params;

    try {
        const exists = await existsInIPFS(cid);

        res.json({
            ipfs: exists
        });

    } catch (error) {
        res.status(500).json({ ipfs: false });
    }
});

export default router;