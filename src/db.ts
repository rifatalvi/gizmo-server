import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URL!;
const client = new MongoClient(uri);

let connected = false;

export async function connectToMongoDB(): Promise<void> {
    if (connected) return;
    await client.connect();
    connected = true;
    console.log('✅ Connected to MongoDB!');

    // Ensure text index exists on products for fast search
    try {
        const col = client.db('gizmo').collection('products');
        await col.createIndex(
            { name: 'text', brand: 'text', description: 'text', category: 'text', tags: 'text' },
            { name: 'products_text_search', default_language: 'english', weights: { name: 10, brand: 5, tags: 3, category: 2, description: 1 } }
        );
        console.log('📝 Products text index ready');
    } catch (e) {
        console.warn('Text index setup skipped:', e);
    }
}

export function db(name = 'gizmo') {
    return client.db(name);
}

export async function disconnectFromMongoDB(): Promise<void> {
    await client.close();
    connected = false;
    console.log('🔌 Disconnected from MongoDB.');
}
