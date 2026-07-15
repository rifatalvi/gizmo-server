import { ObjectId } from 'mongodb';

export interface Product {
    _id?: ObjectId;
    name: string;
    slug: string;
    description: string;
    price: number;
    originalPrice?: number;
    category: 'laptops' | 'phones' | 'audio' | 'gaming' | 'accessories' | 'monitors';
    brand: string;
    image: string;
    images?: string[];
    rating: number;
    reviewCount: number;
    stock: number;
    tags: string[];
    featured: boolean;
    deal?: boolean;
    discountPercent?: number;
    specs?: Record<string, string>;
    createdAt?: Date;
}

export interface CartItem {
    productId: string;
    name: string;
    price: number;
    image: string;
    quantity: number;
}

export interface Cart {
    _id?: ObjectId;
    userId: string;
    items: CartItem[];
    updatedAt?: Date;
}

export interface WishlistItem {
    productId: string;
    name: string;
    price: number;
    image: string;
}

export interface Wishlist {
    _id?: ObjectId;
    userId: string;
    items: WishlistItem[];
    updatedAt?: Date;
}

export interface OrderItem {
    productId: string;
    name: string;
    price: number;
    image: string;
    quantity: number;
}

export interface Order {
    _id?: ObjectId;
    userId: string;
    items: OrderItem[];
    total: number;
    status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
    shippingAddress?: {
        name: string;
        address: string;
        city: string;
        zip: string;
        country: string;
    };
    createdAt?: Date;
    updatedAt?: Date;
}
