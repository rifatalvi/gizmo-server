import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { connectToMongoDB } from './db.js';
import productsRouter from './routes/products.js';
import cartRouter from './routes/cart.js';
import ordersRouter from './routes/orders.js';

const app = express();
const PORT = process.env.PORT ?? 5000;

// ── Middleware ──────────────────────────────────────────────
app.use(cors({
    origin: ['http://localhost:3000', 'http://localhost:3001'],
    credentials: true,
}));
app.use(express.json());

// ── Health check ────────────────────────────────────────────
app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── Routes ──────────────────────────────────────────────────
app.use('/api/products', productsRouter);
app.use('/api/cart', cartRouter);
app.use('/api/orders', ordersRouter);

// ── Start ───────────────────────────────────────────────────
async function start() {
    await connectToMongoDB();
    app.listen(PORT, () => {
        console.log(`🚀 Gizmo Server running on http://localhost:${PORT}`);
    });
}

start().catch((err) => {
    console.error('Failed to start server:', err);
    process.exit(1);
});