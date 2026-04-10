import express from 'express';
import multer from 'multer';
import crypto from 'crypto';
import { uploadToIPFS, persistCID } from '../services/ipfsService.js';
import { verifyCID, storeCID } from "../services/blockchainService.js";
import { measureTime, measureTimeOnly } from '../utils/metrics.js';

const router = express.Router();
const upload = multer();

router.post('/ipfs', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: "No file provided" });
        }

        const totalStart = performance.now();

        const fileBuffer = req.file.buffer;

        const hash = crypto
            .createHash('sha256')
            .update(fileBuffer)
            .digest('hex');

        // --- IPFS ---
        const { result: ipfsResult, time: ipfsTime } =
            await measureTime(() => uploadToIPFS(fileBuffer));

        // --- Blockchain ---
        const {
            result: txResult,
            time: blockchainTime
        } = await measureTime(() => storeCID(ipfsResult.cid));

        // Persistencia SOLO si éxito real
        if (txResult.success) {
            persistCID(ipfsResult.cid);
        }

        // --- Verificación ---
        const verifyTime =
            await measureTimeOnly(() => verifyCID(ipfsResult.cid));

        const [exists, timestamp] = await verifyCID(ipfsResult.cid);

        const totalTime = performance.now() - totalStart;

        res.json({
            cid: ipfsResult.cid,
            hash,
            size: req.file.size,

            metrics: {
                ipfsTime: ipfsTime.toFixed(2),
                blockchainTime: blockchainTime.toFixed(2),
                verifyTime: verifyTime.toFixed(2),
                totalTime: totalTime.toFixed(2),

                gasUsed: txResult.gasUsed.toString()
            },

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