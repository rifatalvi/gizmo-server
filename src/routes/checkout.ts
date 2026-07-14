import { Router, type Request, type Response } from 'express';
import Stripe from 'stripe';

const router = Router();

const CLIENT_URL = process.env.CLIENT_URL ?? 'http://localhost:3000';

// POST /api/checkout  — create a Stripe Checkout Session
router.post('/', async (req: Request, res: Response) => {
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey || stripeKey.includes('REPLACE')) {
        res.status(500).json({ error: 'Stripe is not configured. Please set STRIPE_SECRET_KEY in your .env file.' });
        return;
    }

    const stripe = new Stripe(stripeKey, {
        apiVersion: '2026-06-24.dahlia',
    });

    try {
        const { items } = req.body as {
            items: Array<{
                productId: string;
                name: string;
                price: number;
                image: string;
                quantity: number;
            }>;
        };

        if (!items || items.length === 0) {
            res.status(400).json({ error: 'No items provided' });
            return;
        }

        const line_items: Stripe.Checkout.SessionCreateParams.LineItem[] = items.map((item) => ({
            price_data: {
                currency: 'usd',
                product_data: {
                    name: item.name,
                    images: item.image ? [item.image] : [],
                },
                unit_amount: Math.round(item.price * 100), // Stripe uses cents
            },
            quantity: item.quantity,
        }));

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items,
            mode: 'payment',
            success_url: `${CLIENT_URL}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${CLIENT_URL}/cart`,
        });

        res.json({ url: session.url });
    } catch (err) {
        console.error('Stripe checkout error:', err);
        res.status(500).json({ error: 'Failed to create checkout session' });
    }
});

export default router;

