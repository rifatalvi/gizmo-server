import { Router, type Request, type Response } from 'express';
import { db } from '../db';
import type { Cart, CartItem } from '../types';

const router = Router();

// GET /api/cart/:userId
router.get('/:userId', async (req: Request, res: Response) => {
    try {
        const col = db().collection<Cart>('carts');
        const cart = await col.findOne({ userId: req.params.userId as string });
        res.json(cart ?? { userId: req.params.userId, items: [] });
    } catch {
        res.status(500).json({ error: 'Failed to fetch cart' });
    }
});

// POST /api/cart/:userId  — add or update item
router.post('/:userId', async (req: Request, res: Response) => {
    try {
        const col = db().collection<Cart>('carts');
        const item: CartItem = req.body;
        const userId = req.params.userId as string;

        const cart = await col.findOne({ userId });

        if (!cart) {
            await col.insertOne({ userId, items: [item], updatedAt: new Date() });
        } else {
            const exists = cart.items.find(i => i.productId === item.productId);
            if (exists) {
                await col.updateOne(
                    { userId, 'items.productId': item.productId },
                    { $set: { 'items.$.quantity': item.quantity, updatedAt: new Date() } }
                );
            } else {
                await col.updateOne(
                    { userId },
                    { $push: { items: item }, $set: { updatedAt: new Date() } }
                );
            }
        }

        const updated = await col.findOne({ userId });
        res.json(updated);
    } catch {
        res.status(500).json({ error: 'Failed to update cart' });
    }
});

// DELETE /api/cart/:userId/:productId  — remove item
router.delete('/:userId/:productId', async (req: Request, res: Response) => {
    try {
        const col = db().collection<Cart>('carts');
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

// DELETE /api/cart/:userId  — clear entire cart
router.delete('/:userId', async (req: Request, res: Response) => {
    try {
        const col = db().collection<Cart>('carts');
        await col.updateOne({ userId: req.params.userId as string }, { $set: { items: [], updatedAt: new Date() } });
        res.json({ success: true });
    } catch {
        res.status(500).json({ error: 'Failed to clear cart' });
    }
});

export default router;
