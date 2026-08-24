import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import jwksClient from "jwks-rsa";
import { authContext } from "../utils/auth-context";

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email?: string;
    role?: string;
  };
}

// Initialize the JWKS client pointing to the Supabase well-known endpoint
const jwksUri = "https://qciudgmkzfqmgwprdffl.supabase.co/auth/v1/.well-known/jwks.json";
const client = jwksClient({
  jwksUri,
  cache: true,
  rateLimit: true,
  jwksRequestsPerMinute: 10,
});

// Helper to retrieve the ES256 signing key from JWKS
function getEs256PublicKey(kid: string): Promise<string> {
  return new Promise((resolve, reject) => {
    client.getSigningKey(kid, (err, key) => {
      if (err) {
        return reject(err);
      }
      const signingKey = key?.getPublicKey();
      if (!signingKey) {
        return reject(new Error("Unable to retrieve public key from JWKS"));
      }
      resolve(signingKey);
    });
  });
}

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized: Missing authorization bearer token" });
    return;
  }

  const token = authHeader.split(" ")[1];
  try {
    // 1. Decode the token complete object to inspect the header algorithm
    const rawDecoded = jwt.decode(token, { complete: true }) as any;
    if (!rawDecoded || !rawDecoded.header) {
      res.status(401).json({ error: "Unauthorized: Invalid token format" });
      return;
    }

    const alg = rawDecoded.header.alg;
    let decoded: any;

    if (alg === "HS256") {
      // Verify using symmetric JWT Secret
      const secret = process.env.JWT_SECRET || "placeholder-jwt-access-token-secret-change-in-production";
      let verificationKey: string | Buffer = secret;
      if (secret !== "placeholder-jwt-access-token-secret-change-in-production") {
        try {
          verificationKey = Buffer.from(secret, "base64");
        } catch (e) {
          verificationKey = secret;
        }
      }
      decoded = jwt.verify(token, verificationKey, { algorithms: ["HS256"] }) as any;
    } else if (alg === "ES256") {
      // Verify using asymmetric ES256 key from Supabase JWKS
      if (!rawDecoded.header.kid) {
        res.status(401).json({ error: "Unauthorized: Missing key ID (kid) in token header" });
        return;
      }
      const publicKey = await getEs256PublicKey(rawDecoded.header.kid);
      decoded = jwt.verify(token, publicKey, { algorithms: ["ES256"] }) as any;
    } else {
      res.status(401).json({ error: `Unauthorized: Unsupported token algorithm (${alg})` });
      return;
    }
    
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
    const rawDecoded = jwt.decode(token, { complete: true }) as any;
    console.error("🔒 JWT Verification Failed:", err.message);
    console.error("Failed Token Header:", JSON.stringify(rawDecoded?.header, null, 2));
    console.error("Failed Token Payload:", JSON.stringify(rawDecoded?.payload, null, 2));
    res.status(401).json({ error: "Unauthorized: Invalid or expired access token" });
    return;
  }
}
