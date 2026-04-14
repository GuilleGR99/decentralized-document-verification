import express from 'express';
import multer from 'multer';
import crypto from 'crypto';
import fs from "fs";
import pdfParse from "pdf-parse";
import OpenAI from "openai";

import { uploadToIPFS, persistCID } from '../services/ipfsService.js';
import { verifyCID, storeCID } from "../services/blockchainService.js";
import { measureTime } from '../utils/metrics.js';
import { persistMetrics, getMetrics } from '../services/metricsService.js';

const router = express.Router();
const upload = multer();
const aiResults = {};
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

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

        aiResults[hash] = { status: "pending", data: null };

        // --- IPFS ---
        const { result: ipfsResult, time: ipfsTime } =
            await measureTime(() => uploadToIPFS(fileBuffer));

        // lanzar async DESPUÉS de IPFS
        processDocumentAsync(hash, fileBuffer);

        // --- Verificacion previa ---
        const [existsBefore] = await verifyCID(ipfsResult.cid);

        let txResult = { success: false, gasUsed: 0n };
        let blockchainTime = 0;

        if (!existsBefore) {
            const measured = await measureTime(() => storeCID(ipfsResult.cid));
            txResult = measured.result;
            blockchainTime = measured.time;
        }

        // --- Verificacion final ---
        const verifyStart = performance.now();
        const [exists, timestamp] = await verifyCID(ipfsResult.cid);
        const verifyTime = performance.now() - verifyStart;

        const totalTime = performance.now() - totalStart;

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

// --- METRICS ---
router.get('/metrics', (req, res) => {
    try {
        res.json(getMetrics());
    } catch (error) {
        res.status(500).json({ error: "Error loading metrics" });
    }
});

// --- CIDs ---
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

// --- ASYNC IA ---
async function processDocumentAsync(hash, buffer) {
    try {
        const data = await pdfParse(buffer);
        let text = data.text;

        // PDF vacío
        if (!text || text.trim().length === 0) {
            aiResults[hash] = { status: "done", data: null };
            return;
        }

        // limpieza y truncado
        text = text.replace(/\s+/g, " ").trim().slice(0, 8000);

        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                {
                    role: "user",
                    content: `
                    Extrae la información clave y devuelve SOLO JSON válido:

                    {
                    "tipo": "factura | contrato | informe | otro",
                    "fecha": "YYYY-MM-DD | null",
                    "entidades": ["string"],
                    "idioma": "es | en | otro",
                    "resumen": "máximo 2 frases, descriptivo y general",
                    "palabras_clave": ["string"]
                    }

                    Reglas:
                    - Usa null si no se encuentra el dato
                    - tipo debe ser UNA de las opciones dadas
                    - idioma en formato ISO corto (es, en...)
                    - palabras_clave máximo 5 elementos
                    - No inventes datos

                    Texto:
                    ${text}
                    `
                }
            ]
        });

        let parsed = null;

        try {
            const content = response.choices[0].message.content;
            const match = content.match(/\{[\s\S]*\}/);

            if (match) {
                parsed = JSON.parse(match[0]);
            }
        } catch {
            parsed = null;
        }

        aiResults[hash] = {
            status: "done",
            data: parsed
        };

    } catch (error) {
        console.error(error);

        aiResults[hash] = {
            status: "done",
            data: null
        };
    }
}

// --- ENDPOINT IA ---
router.get('/document/:hash/data', (req, res) => {
    const { hash } = req.params;

    if (!aiResults[hash]) {
        return res.json({ status: "pending" });
    }

    res.json(aiResults[hash]);
});

export default router;