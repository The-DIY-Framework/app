import express from 'express';
import cors from 'cors';
import path from 'path';
import { PORT } from './config';
import ttsRoutes from './routes/ttsRoutes';

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../dist')));

import fs from 'fs';
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

app.use('/api/tts', ttsRoutes);

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});