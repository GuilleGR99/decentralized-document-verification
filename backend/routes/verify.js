import express from 'express';
import { verifyCID } from '../services/blockchainService.js';

const router = express.Router();

router.post('/', async (req, res) => {
    try {
        const { cid } = req.body;

        if (!cid || typeof cid !== "string" || cid.trim() === "") {
            return res.status(400).json({ error: "CID inválido" });
        }

        const cleanCID = cid.trim();

        const start = performance.now();

        const [exists, timestamp] = await verifyCID(cleanCID);

        const verifyTime = performance.now() - start;

        res.json({
            cid: cleanCID,
            exists,

            // valor crudo
            timestamp: timestamp?.toString() || null,

            // valor formateado
            formattedTimestamp: formatTimestamp(timestamp),

            // métrica
            verifyTime: verifyTime.toFixed(2)
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({ error: error.message });
    }
});

function formatTimestamp(ts) {
    if (!ts) return null;

    const date = new Date(Number(ts) * 1000);

    return date.toLocaleString("es-ES", {
        dateStyle: "short",
        timeStyle: "medium"
    });
}

export default router;