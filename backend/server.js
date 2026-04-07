import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

import uploadRoutes from './routes/upload.js';
import verifyRoutes from './routes/verify.js';
import downloadRoutes from './routes/download.js';

const app = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const frontendPath = path.resolve(__dirname, '../frontend');

app.use(cors());
app.use(express.json());

app.use(express.static(frontendPath));

app.get('/', (req, res) => {
    res.sendFile(path.join(frontendPath, 'index.html'));
});

app.use('/upload', uploadRoutes);
app.use('/verify', verifyRoutes);
app.use('/download', downloadRoutes);

app.listen(3000, () => {
    console.log("Server running on http://localhost:3000");
});