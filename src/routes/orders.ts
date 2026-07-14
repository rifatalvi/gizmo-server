import { Router, type Request, type Response } from 'express';
import { ObjectId } from 'mongodb';
import { db } from '../db';
import type { Order } from '../types';

const router = Router();

// GET /api/orders/user/:userId
router.get('/user/:userId', async (req: Request, res: Response) => {
    try {
        const col = db().collection<Order>('orders');
        const orders = await col
            .find({ userId: req.params.userId as string })
            .sort({ createdAt: -1 })
            .toArray();
        res.json(orders);
    } catch {
        res.status(500).json({ error: 'Failed to fetch orders' });
    }
});

// GET /api/orders/:id — single order
router.get('/:id', async (req: Request, res: Response) => {
    try {
        const col = db().collection<Order>('orders');
        const order = await col.findOne({ _id: new ObjectId(req.params.id as string) });
        if (!order) return res.status(404).json({ error: 'Order not found' });
        res.json(order);
    } catch {
        res.status(500).json({ error: 'Failed to fetch order' });
    }
});

// POST /api/orders — place order + clear cart
router.post('/', async (req: Request, res: Response) => {
    try {
        const ordersCol = db().collection<Order>('orders');
        const cartsCol = db().collection('carts');

        const order: Order = {
            ...req.body,
            status: 'pending',
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        const result = await ordersCol.insertOne(order);

        // Clear the user's cart after placing order
        if (order.userId) {
            await cartsCol.updateOne(
                { userId: order.userId },
                { $set: { items: [], updatedAt: new Date() } }
            );
        }

        res.status(201).json({ _id: result.insertedId, ...order });
    } catch {
        res.status(500).json({ error: 'Failed to place order' });
    }
});

// PATCH /api/orders/:id/status — update order status
router.patch('/:id/status', async (req: Request, res: Response) => {
    try {
        const col = db().collection<Order>('orders');
        const { status } = req.body;
        await col.updateOne(
            { _id: new ObjectId(req.params.id as string) },
            { $set: { status, updatedAt: new Date() } }
        );
        res.json({ success: true });
    } catch {
        res.status(500).json({ error: 'Failed to update order status' });
    }
});

export default router;
