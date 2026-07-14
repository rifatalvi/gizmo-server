import { Router, type Request, type Response } from 'express';
import { ObjectId } from 'mongodb';
import { db } from '../db.js';
import type { Product } from '../types.js';

const router = Router();

// GET /api/products
router.get('/', async (req: Request, res: Response) => {
    try {
        const { category, search, featured, deal, limit = '20', page = '1' } = req.query;
        const col = db().collection<Product>('products');

        const filter: Record<string, unknown> = {};
        if (category) filter.category = category;
        if (featured === 'true') filter.featured = true;
        if (deal === 'true') filter.deal = true;
        if (search) {
            filter.$or = [
                { name: { $regex: search, $options: 'i' } },
                { brand: { $regex: search, $options: 'i' } },
                { tags: { $in: [new RegExp(search as string, 'i')] } },
            ];
        }

        const pageNum = parseInt(page as string, 10);
        const limitNum = Math.min(parseInt(limit as string, 10), 100);
        const skip = (pageNum - 1) * limitNum;

        const [products, total] = await Promise.all([
            col.find(filter).skip(skip).limit(limitNum).toArray(),
            col.countDocuments(filter),
        ]);

        res.json({ products, total, page: pageNum, limit: limitNum, pages: Math.ceil(total / limitNum) });
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch products' });
    }
});

// GET /api/products/:id
router.get('/:id', async (req: Request, res: Response) => {
    try {
        const col = db().collection<Product>('products');
        const product = await col.findOne({ _id: new ObjectId(req.params.id as string) });
        if (!product) return res.status(404).json({ error: 'Product not found' });
        res.json(product);
    } catch {
        res.status(500).json({ error: 'Failed to fetch product' });
    }
});

// POST /api/products
router.post('/', async (req: Request, res: Response) => {
    try {
        const col = db().collection<Product>('products');
        const product: Product = { ...req.body, createdAt: new Date() };
        const result = await col.insertOne(product);
        res.status(201).json({ _id: result.insertedId, ...product });
    } catch {
        res.status(500).json({ error: 'Failed to create product' });
    }
});

// PUT /api/products/:id
router.put('/:id', async (req: Request, res: Response) => {
    try {
        const col = db().collection<Product>('products');
        const { _id, ...update } = req.body;
        await col.updateOne({ _id: new ObjectId(req.params.id as string) }, { $set: update });
        res.json({ success: true });
    } catch {
        res.status(500).json({ error: 'Failed to update product' });
    }
});

// DELETE /api/products/:id
router.delete('/:id', async (req: Request, res: Response) => {
    try {
        const col = db().collection<Product>('products');
        await col.deleteOne({ _id: new ObjectId(req.params.id as string) });
        res.json({ success: true });
    } catch {
        res.status(500).json({ error: 'Failed to delete product' });
    }
});

export default router;
