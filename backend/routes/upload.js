import express from 'express';
import multer from 'multer';
import crypto from 'crypto';
import { uploadToIPFS, persistCID } from '../services/ipfsService.js';
import {verifyCID, storeCID } from "../services/blockchainService.js";
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

        const stored = await storeCID(result.cid);

        if (stored) {
            persistCID(result.cid);
        }

        persistCID(result.cid);

        const end = performance.now();

        // Verificar correcto almacenamiento
        const [exists, timestamp] = await verifyCID(result.cid);

        res.json({
            cid: result.cid,
            hash,
            size: req.file.size,
            time: (end - start).toFixed(2),
            ipfs: true,
            blockchain: exists,
            timestamp: timestamp.toString()
        });

        } catch (error) {
            console.error(error);

            res.status(500).json({ 
                error: error.message,
                stack: error.stack
            });
        }
});

export default router;