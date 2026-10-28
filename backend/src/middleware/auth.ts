import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../db/prisma';
import { config } from '../config/env';

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  username?: string | null;
  avatarUrl?: string | null;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
      sessionToken?: string;
    }
  }
}

export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Check Authorization header or HTTP-only cookie
    let token: string | undefined;

    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    } else if (req.cookies && req.cookies.balance_token) {
      token = req.cookies.balance_token;
    }

    if (!token) {
      return res.status(401).json({ error: 'Authentication required. No session token provided.' });
    }

    // Verify JWT signature
    let decoded: any;
    try {
      decoded = jwt.verify(token, config.sessionSecret);
    } catch (err) {
      return res.status(401).json({ error: 'Invalid or expired session token.' });
    }

    if (!decoded || !decoded.userId || !decoded.sessionId) {
      return res.status(401).json({ error: 'Malformed authentication token.' });
    }

    // Look up session in database for server-managed session invalidation
    const session = await prisma.session.findUnique({
      where: { id: decoded.sessionId },
      include: { user: true },
    });

    if (!session) {
      return res.status(401).json({ error: 'Session has been invalidated or logged out.' });
    }

    if (session.expiresAt < new Date()) {
      // Clean up expired session
      await prisma.session.delete({ where: { id: session.id } }).catch(() => {});
      return res.status(401).json({ error: 'Session has expired. Please sign in again.' });
    }

    req.user = {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
      username: session.user.username,
      avatarUrl: session.user.avatarUrl,
    };
    req.sessionToken = token;

    next();
  } catch (error) {
    console.error('Authentication middleware error:', error);
    return res.status(500).json({ error: 'Internal authentication error.' });
  }
};

