import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { connectToMongoDB } from './db';
import productsRouter from './routes/products';
import cartRouter from './routes/cart';
import ordersRouter from './routes/orders';
import checkoutRouter from './routes/checkout';

const app = express();
const PORT = process.env.PORT ?? 5000;

// ── Middleware ──────────────────────────────────────────────
app.use(cors({
    origin: [process.env.CLIENT_URL || 'http://localhost:3000'],
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
app.use('/api/checkout', checkoutRouter);
// ajjaj
// ── Start ───────────────────────────────────────────────────
if (process.env.NODE_ENV !== 'production') {
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
} else {
    // In production (e.g. Vercel), we just export the app and connect to DB.
    connectToMongoDB().catch(console.error);
}

export default app;