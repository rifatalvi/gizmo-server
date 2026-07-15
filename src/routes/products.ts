import { Router, type Request, type Response } from 'express';
import { ObjectId } from 'mongodb';
import { db } from '../db';
import type { Product } from '../types';
import { authenticate } from '../middleware/auth';

const router = Router();

// GET /api/products
// Query params: category, search, sort, priceMin, priceMax, minRating, featured, deal, limit, page
router.get('/', async (req: Request, res: Response) => {
    try {
        const {
            category,
            search,
            sort = 'newest',
            priceMin,
            priceMax,
            minRating,
            featured,
            deal,
            limit = '12',
            page = '1',
        } = req.query;

        const col = db().collection<Product>('products');
        const filter: Record<string, unknown> = {};

        // Category filter
        if (category && category !== 'all') {
            filter.category = category;
        }

        // Featured / deal flags
        if (featured === 'true') filter.featured = true;
        if (deal === 'true') filter.deal = true;

        // Price range filter
        const minP = priceMin !== undefined ? parseFloat(priceMin as string) : undefined;
        const maxP = priceMax !== undefined ? parseFloat(priceMax as string) : undefined;
        if (minP !== undefined || maxP !== undefined) {
            filter.price = {
                ...(minP !== undefined ? { $gte: minP } : {}),
                ...(maxP !== undefined && maxP < 999999 ? { $lte: maxP } : {}),
            };
        }

        // Minimum rating filter
        if (minRating) {
            const minR = parseFloat(minRating as string);
            if (minR > 0) filter.rating = { $gte: minR };
        }

        // Text search — regex across key fields (compatible with all filter combinations)
        if (search) {
            const regex = new RegExp((search as string).trim(), 'i');
            filter.$or = [
                { name: regex },
                { brand: regex },
                { category: regex },
                { description: regex },
                { tags: { $in: [regex] } },
            ];
        }

        // Sort
        type SortOrder = 1 | -1;
        let sortObj: Record<string, SortOrder> = { createdAt: -1 }; // newest default
        if (sort === 'price_asc') sortObj = { price: 1 };
        else if (sort === 'price_desc') sortObj = { price: -1 };
        else if (sort === 'rating') sortObj = { rating: -1 };

        // Pagination
        const pageNum = Math.max(1, parseInt(page as string, 10));
        const limitNum = Math.min(100, parseInt(limit as string, 10));
        const skip = (pageNum - 1) * limitNum;

        const [products, total] = await Promise.all([
            col.find(filter).sort(sortObj).skip(skip).limit(limitNum).toArray(),
            col.countDocuments(filter),
        ]);

        res.json({
            products,
            total,
            page: pageNum,
            limit: limitNum,
            pages: Math.ceil(total / limitNum),
        });
    } catch (err) {
        console.error('GET /api/products error:', err);
        res.status(500).json({ error: 'Failed to fetch products' });
    }
});

// GET /api/products/:id  — by ObjectId or slug
router.get('/:id', async (req: Request, res: Response) => {
    try {
        const col = db().collection<Product>('products');
        const { id } = req.params;

        let product = null;
        if (typeof id === 'string' && ObjectId.isValid(id)) {
            product = await col.findOne({ _id: new ObjectId(id) });
        }
        // Fallback: search by slug
        if (!product && typeof id === 'string') {
            product = await col.findOne({ slug: id });
        }

        if (!product) return res.status(404).json({ error: 'Product not found' });
        res.json(product);
    } catch (err) {
        console.error('GET /api/products/:id error:', err);
        res.status(500).json({ error: 'Failed to fetch product' });
    }
});

// POST /api/products  (admin only)
router.post('/', authenticate, async (req: Request, res: Response) => {
    try {
        const col = db().collection<Product>('products');
        const product: Product = { ...req.body, createdAt: new Date() };
        const result = await col.insertOne(product);
        res.status(201).json({ _id: result.insertedId, ...product });
    } catch (err) {
        console.error('POST /api/products error:', err);
        res.status(500).json({ error: 'Failed to create product' });
    }
});

// PUT /api/products/:id  (admin only)
router.put('/:id', authenticate, async (req: Request, res: Response) => {
    try {
        const col = db().collection<Product>('products');
        const { _id, ...update } = req.body;
        await col.updateOne(
            { _id: new ObjectId(req.params.id as string) },
            { $set: { ...update, updatedAt: new Date() } }
        );
        res.json({ success: true });
    } catch (err) {
        console.error('PUT /api/products/:id error:', err);
        res.status(500).json({ error: 'Failed to update product' });
    }
});

// DELETE /api/products/:id  (admin only)
router.delete('/:id', authenticate, async (req: Request, res: Response) => {
    try {
        const col = db().collection<Product>('products');
        await col.deleteOne({ _id: new ObjectId(req.params.id as string) });
        res.json({ success: true });
    } catch (err) {
        console.error('DELETE /api/products/:id error:', err);
        res.status(500).json({ error: 'Failed to delete product' });
    }
});

export default router;
