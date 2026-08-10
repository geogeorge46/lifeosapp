import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { authContext } from "../utils/auth-context";

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email?: string;
    role?: string;
  };
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized: Missing authorization bearer token" });
    return;
  }

  const token = authHeader.split(" ")[1];
  try {
    const secret = process.env.JWT_SECRET || "placeholder-jwt-access-token-secret-change-in-production";
    
    // Supabase JWT secrets are base64-encoded. We decode to Buffer to match the HS256 signature.
    let verificationKey: string | Buffer = secret;
    if (secret !== "placeholder-jwt-access-token-secret-change-in-production") {
      try {
        verificationKey = Buffer.from(secret, "base64");
      } catch (e) {
        verificationKey = secret;
      }
    }

    const decoded = jwt.verify(token, verificationKey) as any;
    
    const userPayload = {
      id: decoded.sub,
      email: decoded.email,
      role: decoded.role
    };

    (req as AuthenticatedRequest).user = userPayload;

    // Execute downstream middleware & routes inside the active user session context
    authContext.run({ userId: decoded.sub }, () => {
      next();
    });
    return;
  } catch (err: any) {
    res.status(401).json({ error: "Unauthorized: Invalid or expired access token" });
    return;
  }
}
