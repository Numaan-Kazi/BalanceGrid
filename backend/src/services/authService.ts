import { OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { prisma } from '../db/prisma';
import { config } from '../config/env';
import { AppError } from '../middleware/errorHandler';

const oauthClient = config.google.clientId
  ? new OAuth2Client(config.google.clientId, config.google.clientSecret, config.google.callbackUrl)
  : null;

const DEFAULT_CATEGORIES = [
  { name: 'Groceries', icon: 'shopping-cart' },
  { name: 'Food & Dining', icon: 'utensils' },
  { name: 'Transport', icon: 'car' },
  { name: 'Housing & Rent', icon: 'home' },
  { name: 'Utilities', icon: 'zap' },
  { name: 'Healthcare', icon: 'heart-pulse' },
  { name: 'Shopping', icon: 'shopping-bag' },
  { name: 'Entertainment', icon: 'tv' },
  { name: 'Travel', icon: 'plane' },
  { name: 'Other', icon: 'tag' },
];

export const isGoogleOAuthConfigured = (): boolean => {
  return Boolean(config.google.clientId && config.google.clientSecret);
};

export const getGoogleAuthUrl = (): string => {
  if (!oauthClient || !config.google.clientId) {
    throw new AppError(
      'Google OAuth credentials are not configured. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in backend/.env',
      503
    );
  }

  return oauthClient.generateAuthUrl({
    access_type: 'offline',
    scope: ['openid', 'email', 'profile'],
    prompt: 'select_account',
  });
};

export interface GoogleUserInfo {
  googleId: string;
  email: string;
  name: string;
  avatarUrl?: string;
}

export const verifyGoogleCredentialToken = async (credential: string): Promise<GoogleUserInfo> => {
  if (!config.google.clientId) {
    throw new AppError('Google OAuth is not configured on this server.', 503);
  }

  const client = new OAuth2Client(config.google.clientId);
  const ticket = await client.verifyIdToken({
    idToken: credential,
    audience: config.google.clientId,
  });

  const payload = ticket.getPayload();
  if (!payload || !payload.sub || !payload.email) {
    throw new AppError('Invalid Google credential token payload.', 401);
  }

  return {
    googleId: payload.sub,
    email: payload.email,
    name: payload.name || payload.email.split('@')[0],
    avatarUrl: payload.picture,
  };
};

export const handleGoogleCallbackCode = async (code: string): Promise<GoogleUserInfo> => {
  if (!oauthClient) {
    throw new AppError('Google OAuth is not configured on this server.', 503);
  }

  const { tokens } = await oauthClient.getToken(code);
  if (!tokens.id_token) {
    throw new AppError('Failed to obtain ID token from Google.', 401);
  }

  return verifyGoogleCredentialToken(tokens.id_token);
};

export const hashPassword = (password: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const salt = crypto.randomBytes(16).toString('hex');
    crypto.scrypt(password, salt, 64, (err, derivedKey) => {
      if (err) return reject(err);
      resolve(`${salt}:${derivedKey.toString('hex')}`);
    });
  });
};

export const verifyPassword = (password: string, combinedHash: string): Promise<boolean> => {
  return new Promise(resolve => {
    const parts = combinedHash.split(':');
    if (parts.length !== 2) return resolve(false);
    const [salt, key] = parts;
    crypto.scrypt(password, salt, 64, (err, derivedKey) => {
      if (err) return resolve(false);
      try {
        const keyBuffer = Buffer.from(key, 'hex');
        const match = crypto.timingSafeEqual(keyBuffer, derivedKey);
        resolve(match);
      } catch {
        resolve(false);
      }
    });
  });
};

export const createSessionForUser = async (user: {
  id: string;
  email: string;
  name: string;
  username?: string | null;
  avatarUrl?: string | null;
}) => {
  // Create database-backed server session (30 days validity)
  const sessionDurationMs = 30 * 24 * 60 * 60 * 1000;
  const expiresAt = new Date(Date.now() + sessionDurationMs);

  const session = await prisma.session.create({
    data: {
      userId: user.id,
      token: `sess_${Date.now()}_${Math.random().toString(36).substring(2)}`,
      expiresAt,
    },
  });

  const jwtToken = jwt.sign(
    {
      userId: user.id,
      sessionId: session.id,
    },
    config.sessionSecret,
    { expiresIn: '30d' }
  );

  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      username: user.username || null,
      avatarUrl: user.avatarUrl || null,
    },
    token: jwtToken,
    expiresAt,
  };
};

export const registerWithPassword = async (data: {
  name: string;
  username: string;
  email: string;
  password: string;
}) => {
  const normalizedEmail = data.email.trim().toLowerCase();
  const normalizedUsername = data.username.trim().toLowerCase();

  // Check username uniqueness
  const existingUsername = await prisma.user.findFirst({
    where: { username: { equals: normalizedUsername, mode: 'insensitive' } },
  });
  if (existingUsername) {
    throw new AppError('Username is already taken. Please choose another.', 400);
  }

  // Check email uniqueness
  const existingEmail = await prisma.user.findFirst({
    where: { email: { equals: normalizedEmail, mode: 'insensitive' } },
  });
  if (existingEmail) {
    throw new AppError('An account with this email already exists.', 400);
  }

  const passwordHash = await hashPassword(data.password);

  const newUser = await prisma.$transaction(async tx => {
    const user = await tx.user.create({
      data: {
        name: data.name.trim(),
        username: normalizedUsername,
        email: normalizedEmail,
        passwordHash,
      },
    });

    // Seed default categories
    for (const cat of DEFAULT_CATEGORIES) {
      await tx.category.create({
        data: {
          userId: user.id,
          name: cat.name,
          icon: cat.icon,
          isDefault: true,
        },
      });
    }

    return user;
  });

  return createSessionForUser(newUser);
};

export const loginWithPassword = async (data: {
  identifier: string;
  password: string;
}) => {
  const idLower = data.identifier.trim().toLowerCase();

  // Search by either username or email
  const user = await prisma.user.findFirst({
    where: {
      OR: [
        { email: { equals: idLower, mode: 'insensitive' } },
        { username: { equals: idLower, mode: 'insensitive' } },
      ],
    },
  });

  if (!user || !user.passwordHash) {
    throw new AppError('Invalid username/email or password', 401);
  }

  const isValid = await verifyPassword(data.password, user.passwordHash);
  if (!isValid) {
    throw new AppError('Invalid username/email or password', 401);
  }

  return createSessionForUser(user);
};

export const findOrCreateUserAndCreateSession = async (userInfo: GoogleUserInfo) => {
  // Check if user already exists with this Google ID
  let user = await prisma.user.findUnique({
    where: { googleId: userInfo.googleId },
  });

  if (!user) {
    // Check if user exists by email (to avoid duplicate accounts if previously created)
    user = await prisma.user.findUnique({
      where: { email: userInfo.email },
    });

    if (user) {
      // Link Google ID to existing user
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          googleId: userInfo.googleId,
          avatarUrl: userInfo.avatarUrl || user.avatarUrl,
        },
      });
    } else {
      // First-time login: create user in transaction with default categories
      user = await prisma.$transaction(async tx => {
        const newUser = await tx.user.create({
          data: {
            email: userInfo.email,
            googleId: userInfo.googleId,
            name: userInfo.name,
            avatarUrl: userInfo.avatarUrl,
          },
        });

        // Seed default categories for this user
        for (const cat of DEFAULT_CATEGORIES) {
          await tx.category.create({
            data: {
              userId: newUser.id,
              name: cat.name,
              icon: cat.icon,
              isDefault: true,
            },
          });
        }

        return newUser;
      });
    }
  }

  return createSessionForUser(user);
};

export const terminateSession = async (token: string) => {
  try {
    const decoded: any = jwt.verify(token, config.sessionSecret);
    if (decoded && decoded.sessionId) {
      // Invalidate session in DB without deleting any financial records
      await prisma.session.delete({
        where: { id: decoded.sessionId },
      }).catch(() => {});
    }
  } catch (err) {
    // If token already invalid, nothing to delete
  }
};


