import 'dotenv/config';
import express, { type Request, type Response } from 'express';
import cors from 'cors';
import { MongoClient, ObjectId } from 'mongodb';
import { Router } from 'express';

// ── DB Setup ───────────────────────────────────────────────────
const mongoUri = process.env.MONGODB_URL!;
const client = new MongoClient(mongoUri);
let connected = false;

async function connectDB() {
    if (connected) return;
    await client.connect();
    connected = true;
}

function db(name = 'gizmo') {
    return client.db(name);
}

// ── App ────────────────────────────────────────────────────────
const app = express();

const allowedOrigins = [
    process.env.CLIENT_URL || 'http://localhost:3000',
];

app.use(cors({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.some(o => origin.startsWith(o)) || origin.includes('vercel.app')) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
}));
app.use(express.json());

// ── Health ──────────────────────────────────────────────────────
app.get('/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── Products Routes ─────────────────────────────────────────────
const productsRouter = Router();

productsRouter.get('/', async (req: Request, res: Response) => {
    try {
        const {
            category, search, sort = 'newest', priceMin, priceMax,
            minRating, featured, deal, limit = '12', page = '1',
        } = req.query;

        const col = db().collection('products');
        const filter: Record<string, unknown> = {};

        if (category && category !== 'all') filter.category = category;
        if (featured === 'true') filter.featured = true;
        if (deal === 'true') filter.deal = true;

        const minP = priceMin !== undefined ? parseFloat(priceMin as string) : undefined;
        const maxP = priceMax !== undefined ? parseFloat(priceMax as string) : undefined;
        if (minP !== undefined || maxP !== undefined) {
            filter.price = {
                ...(minP !== undefined ? { $gte: minP } : {}),
                ...(maxP !== undefined && maxP < 999999 ? { $lte: maxP } : {}),
            };
        }

        if (minRating) {
            const minR = parseFloat(minRating as string);
            if (minR > 0) filter.rating = { $gte: minR };
        }

        if (search) {
            const regex = new RegExp(search as string, 'i');
            filter.$or = [
                { name: regex }, { brand: regex }, { category: regex },
                { description: regex }, { tags: { $in: [regex] } },
            ];
        }

        type SortOrder = 1 | -1;
        let sortObj: Record<string, SortOrder> = { createdAt: -1 };
        if (sort === 'price_asc') sortObj = { price: 1 };
        else if (sort === 'price_desc') sortObj = { price: -1 };
        else if (sort === 'rating') sortObj = { rating: -1 };

        const pageNum = Math.max(1, parseInt(page as string, 10));
        const limitNum = Math.min(100, parseInt(limit as string, 10));
        const skip = (pageNum - 1) * limitNum;

        const [products, total] = await Promise.all([
            col.find(filter).sort(sortObj).skip(skip).limit(limitNum).toArray(),
            col.countDocuments(filter),
        ]);

        res.json({ products, total, page: pageNum, limit: limitNum, pages: Math.ceil(total / limitNum) });
    } catch (err) {
        console.error('GET /api/products error:', err);
        res.status(500).json({ error: 'Failed to fetch products' });
    }
});

productsRouter.get('/:id', async (req: Request, res: Response) => {
    try {
        const col = db().collection('products');
        const { id } = req.params;
        let product = null;
        if (typeof id === 'string' && ObjectId.isValid(id)) {
            product = await col.findOne({ _id: new ObjectId(id) });
        }
        if (!product && typeof id === 'string') {
            product = await col.findOne({ slug: id });
        }
        if (!product) return res.status(404).json({ error: 'Product not found' });
        res.json(product);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch product' });
    }
});

productsRouter.post('/', async (req: Request, res: Response) => {
    try {
        const col = db().collection('products');
        const product = { ...req.body, createdAt: new Date() };
        const result = await col.insertOne(product);
        res.status(201).json({ _id: result.insertedId, ...product });
    } catch (err) {
        res.status(500).json({ error: 'Failed to create product' });
    }
});

productsRouter.put('/:id', async (req: Request, res: Response) => {
    try {
        const col = db().collection('products');
        const { _id, ...update } = req.body;
        await col.updateOne(
            { _id: new ObjectId(req.params.id as string) },
            { $set: { ...update, updatedAt: new Date() } }
        );
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed to update product' });
    }
});

productsRouter.delete('/:id', async (req: Request, res: Response) => {
    try {
        const col = db().collection('products');
        await col.deleteOne({ _id: new ObjectId(req.params.id as string) });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete product' });
    }
});

// ── Cart Routes ─────────────────────────────────────────────────
const cartRouter = Router();

cartRouter.get('/:userId', async (req: Request, res: Response) => {
    try {
        const cart = await db().collection('carts').findOne({ userId: req.params.userId });
        res.json(cart || { userId: req.params.userId, items: [] });
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch cart' });
    }
});

cartRouter.post('/:userId', async (req: Request, res: Response) => {
    try {
        const col = db().collection('carts');
        const { productId, name, price, image, quantity = 1 } = req.body;
        const existing = await col.findOne({ userId: req.params.userId });
        if (!existing) {
            const cart = { userId: req.params.userId, items: [{ productId, name, price, image, quantity }] };
            await col.insertOne(cart);
            return res.json(cart);
        }
        const items: any[] = existing.items as any[];
        const idx = items.findIndex((i: any) => i.productId === productId);
        if (idx > -1) items[idx].quantity += quantity;
        else items.push({ productId, name, price, image, quantity });
        await col.updateOne({ userId: req.params.userId }, { $set: { items } });
        res.json({ userId: req.params.userId, items });
    } catch (err) {
        res.status(500).json({ error: 'Failed to update cart' });
    }
});

cartRouter.delete('/:userId/:productId', async (req: Request, res: Response) => {
    try {
        const col = db().collection('carts');
        const cart = await col.findOne({ userId: req.params.userId });
        if (!cart) return res.status(404).json({ error: 'Cart not found' });
        const items = (cart.items as any[]).filter((i: any) => i.productId !== req.params.productId);
        await col.updateOne({ userId: req.params.userId }, { $set: { items } });
        res.json({ userId: req.params.userId, items });
    } catch (err) {
        res.status(500).json({ error: 'Failed to remove item' });
    }
});

cartRouter.delete('/:userId', async (req: Request, res: Response) => {
    try {
        await db().collection('carts').deleteOne({ userId: req.params.userId });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed to clear cart' });
    }
});

// ── Orders Routes ───────────────────────────────────────────────
const ordersRouter = Router();

ordersRouter.get('/user/:userId', async (req: Request, res: Response) => {
    try {
        const orders = await db().collection('orders').find({ userId: req.params.userId }).toArray();
        res.json(orders);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch orders' });
    }
});

ordersRouter.get('/', async (_req: Request, res: Response) => {
    try {
        const orders = await db().collection('orders').find({}).toArray();
        res.json(orders);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch orders' });
    }
});

ordersRouter.get('/:id', async (req: Request, res: Response) => {
    try {
        const order = await db().collection('orders').findOne({ _id: new ObjectId(req.params.id as string) });
        if (!order) return res.status(404).json({ error: 'Order not found' });
        res.json(order);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch order' });
    }
});

ordersRouter.post('/', async (req: Request, res: Response) => {
    try {
        const order = { ...req.body, status: 'pending', createdAt: new Date() };
        const result = await db().collection('orders').insertOne(order);
        res.status(201).json({ _id: result.insertedId, ...order });
    } catch (err) {
        res.status(500).json({ error: 'Failed to place order' });
    }
});

// ── Mount Routes ───────────────────────────────────────────────
app.use('/api/products', productsRouter);
app.use('/api/cart', cartRouter);
app.use('/api/orders', ordersRouter);

// ── Connect DB then export for Vercel ──────────────────────────
connectDB().catch(console.error);

export default app;
