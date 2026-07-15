import { Router, type Request, type Response } from 'express';
import { db } from '../db';
import type { Wishlist, WishlistItem } from '../types';

const router = Router();

// GET /api/wishlists/:userId
router.get('/:userId', async (req: Request, res: Response) => {
    try {
        const col = db().collection<Wishlist>('wishlists');
        const wishlist = await col.findOne({ userId: req.params.userId as string });
        res.json(wishlist ?? { userId: req.params.userId, items: [] });
    } catch {
        res.status(500).json({ error: 'Failed to fetch wishlist' });
    }
});

// POST /api/wishlists/:userId  — add item
router.post('/:userId', async (req: Request, res: Response) => {
    try {
        const col = db().collection<Wishlist>('wishlists');
        const item: WishlistItem = req.body;
        const userId = req.params.userId as string;

        const wishlist = await col.findOne({ userId });

        if (!wishlist) {
            await col.insertOne({ userId, items: [item], updatedAt: new Date() });
        } else {
            const exists = wishlist.items.find(i => i.productId === item.productId);
            if (!exists) {
                await col.updateOne(
                    { userId },
                    { $push: { items: item }, $set: { updatedAt: new Date() } }
                );
            }
        }

        const updated = await col.findOne({ userId });
        res.json(updated);
    } catch {
        res.status(500).json({ error: 'Failed to update wishlist' });
    }
});

// DELETE /api/wishlists/:userId/:productId  — remove item
router.delete('/:userId/:productId', async (req: Request, res: Response) => {
    try {
        const col = db().collection<Wishlist>('wishlists');
        await col.updateOne(
            { userId: req.params.userId as string },
            { $pull: { items: { productId: req.params.productId as string } }, $set: { updatedAt: new Date() } }
        );
        const updated = await col.findOne({ userId: req.params.userId as string });
        res.json(updated ?? { userId: req.params.userId, items: [] });
    } catch {
        res.status(500).json({ error: 'Failed to remove item' });
    }
});

export default router;
