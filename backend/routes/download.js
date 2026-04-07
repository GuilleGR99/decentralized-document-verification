import express from 'express';
import { getFromIPFS } from '../services/ipfsService.js';

const router = express.Router();

router.get('/:cid', async (req, res) => {
    try {
        const data = await getFromIPFS(req.params.cid);

        res.setHeader('Content-Disposition', 'attachment');
        res.send(data);

    } catch (error) {
        res.status(500).send("Download failed");
    }
});

export default router;