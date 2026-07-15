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
        try {
            await col.createIndex(
                { name: 'text', brand: 'text', description: 'text', category: 'text', tags: 'text' },
                { name: 'products_text_search', default_language: 'english', weights: { name: 10, brand: 5, tags: 3, category: 2, description: 1 } }
            );
            console.log('📝 Products text index ready');
        } catch (e: any) {
            // Error code 85: IndexOptionsConflict
            if (e.code === 85) {
                console.log('🔄 Text index options conflict detected, dropping old text index...');
                // Get all indexes
                const indexes = await col.indexes();
                // Find the existing text index
                const textIndex = indexes.find((idx: any) =>
                    Object.values(idx.key).includes('text') || idx.name.includes('text')
                );
                if (textIndex && textIndex.name) {
                    await col.dropIndex(textIndex.name);
                    console.log(`🗑️ Dropped old text index: ${textIndex.name}`);
                    // Try creating again
                    await col.createIndex(
                        { name: 'text', brand: 'text', description: 'text', category: 'text', tags: 'text' },
                        { name: 'products_text_search', default_language: 'english', weights: { name: 10, brand: 5, tags: 3, category: 2, description: 1 } }
                    );
                    console.log('✅ Recreated new text index successfully!');
                }
            } else {
                throw e; // rethrow if it's not a conflict
            }
        }
    } catch (e) {
        console.warn('Text index setup skipped or failed:', e);
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
