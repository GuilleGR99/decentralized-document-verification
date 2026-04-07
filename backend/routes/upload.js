import express from 'express';
import multer from 'multer';
import crypto from 'crypto';
import { uploadToIPFS } from '../services/ipfsService.js';

const router = express.Router();
const upload = multer();

router.post('/ipfs', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: "No file provided" });
        }

        const fileBuffer = req.file.buffer;

        const hash = crypto
            .createHash('sha256')
            .update(fileBuffer)
            .digest('hex');

        const start = performance.now();

        const result = await uploadToIPFS(fileBuffer);

        const end = performance.now();

        res.json({
            cid: result.cid,
            hash,
            size: req.file.size,
            time: (end - start).toFixed(2)
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "IPFS upload failed" });
    }
});

export default router;