import express from 'express';
import multer from 'multer';
import crypto from 'crypto';
import fs from "fs";

import { uploadToIPFS, persistCID } from '../services/ipfsService.js';
import { verifyCID, storeCID } from "../services/blockchainService.js";
import { measureTime } from '../utils/metrics.js';
import { persistMetrics, getMetrics } from '../services/metricsService.js';

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

        // --- Verificacion previa ---
        const [existsBefore] = await verifyCID(ipfsResult.cid);

        let txResult = { success: false, gasUsed: 0n };
        let blockchainTime = 0;

        // --- Blockchain solo si no existe ---
        if (!existsBefore) {
            const measured = await measureTime(() => storeCID(ipfsResult.cid));
            txResult = measured.result;
            blockchainTime = measured.time;
        }

        // --- Verificacion final ---
        const verifyStart = performance.now();
        const [exists, timestamp] = await verifyCID(ipfsResult.cid);
        const verifyTime = performance.now() - verifyStart;

        // --- Total ---
        const totalTime = performance.now() - totalStart;

        // --- Persistencia ---
        persistCID(ipfsResult.cid);

        persistMetrics({
            cid: ipfsResult.cid,
            timestamp: Date.now(),
            size: req.file.size,
            metrics: {
                ipfsTime,
                blockchainTime,
                verifyTime,
                totalTime,
                gasUsed: txResult.gasUsed.toString()
            }
        });

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
            duplicate: existsBefore,
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


// --- ENDPOINT METRICAS ---
router.get('/metrics', (req, res) => {
    try {
        const metrics = getMetrics();
        res.json(metrics);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error loading metrics" });
    }
});


// --- ENDPOINT CIDs ---
router.get('/cids', (req, res) => {
    try {
        const path = "/shared/registry.json";

        const data = fs.existsSync(path)
            ? JSON.parse(fs.readFileSync(path))
            : [];

        res.json(data);

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

export default router;