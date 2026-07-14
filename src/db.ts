import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URL!;
const client = new MongoClient(uri);

let connected = false;

export async function connectToMongoDB(): Promise<void> {
    if (connected) return;
    await client.connect();
    connected = true;
    console.log('✅ Connected to MongoDB!');
}

export function db(name = 'gizmo') {
    return client.db(name);
}

export async function disconnectFromMongoDB(): Promise<void> {
    await client.close();
    connected = false;
    console.log('🔌 Disconnected from MongoDB.');
}
