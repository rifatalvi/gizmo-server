import type { Request, Response, NextFunction } from "express";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-in-production";
const secretKey = new TextEncoder().encode(JWT_SECRET);

export interface AuthRequest extends Request {
  userId?: string;
}

export async function authenticate(req: AuthRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    res.status(401).json({ message: "No token provided" });
    return;
  }

  const token = header.split(" ")[1];
  if (!token) {
    res.status(401).json({ message: "Malformed token" });
    return;
  }

  try {
    const { jwtVerify } = await import("jose");
    const { payload } = await jwtVerify(token, secretKey);
    req.userId = payload.userId as string;
    next();
  } catch (err) {
    res.status(401).json({ message: "Invalid token" });
  }
}
