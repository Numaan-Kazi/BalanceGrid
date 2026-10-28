import { Router, Request, Response } from 'express';
import {
  isGoogleOAuthConfigured,
  getGoogleAuthUrl,
  handleGoogleCallbackCode,
  verifyGoogleCredentialToken,
  findOrCreateUserAndCreateSession,
  registerWithPassword,
  loginWithPassword,
  terminateSession,
} from '../services/authService';
import { authenticate } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { registerSchema, loginSchema } from '../validators/schemas';
import { config } from '../config/env';

const router = Router();

// Check authentication configuration and status
router.get('/status', (req: Request, res: Response) => {
  res.json({
    googleOAuthConfigured: isGoogleOAuthConfigured(),
    googleClientId: config.google.clientId || null,
  });
});

// Standard Registration (Username & Password)
router.post('/register', validateBody(registerSchema), async (req: Request, res: Response, next) => {
  try {
    const { user, token, expiresAt } = await registerWithPassword(req.body);

    res.cookie('balance_token', token, {
      httpOnly: true,
      secure: config.isProduction,
      sameSite: config.isProduction ? 'strict' : 'lax',
      expires: expiresAt,
    });

    res.status(201).json({ user, token });
  } catch (error) {
    next(error);
  }
});

// Standard Login (Username/Email & Password)
router.post('/login', validateBody(loginSchema), async (req: Request, res: Response, next) => {
  try {
    const { user, token, expiresAt } = await loginWithPassword(req.body);

    res.cookie('balance_token', token, {
      httpOnly: true,
      secure: config.isProduction,
      sameSite: config.isProduction ? 'strict' : 'lax',
      expires: expiresAt,
    });

    res.json({ user, token });
  } catch (error) {
    next(error);
  }
});

// Return Google OAuth login URL for redirect flow
router.get('/google/url', (req: Request, res: Response, next) => {
  try {
    const url = getGoogleAuthUrl();
    res.json({ url });
  } catch (error) {
    next(error);
  }
});

// OAuth Callback handling
router.get('/google/callback', async (req: Request, res: Response, next) => {
  try {
    const code = req.query.code as string;
    if (!code) {
      return res.redirect(`${config.frontendUrl}/login?error=missing_code`);
    }

    const userInfo = await handleGoogleCallbackCode(code);
    const { token, expiresAt } = await findOrCreateUserAndCreateSession(userInfo);

    // Set secure HTTP-only cookie
    res.cookie('balance_token', token, {
      httpOnly: true,
      secure: config.isProduction,
      sameSite: config.isProduction ? 'strict' : 'lax',
      expires: expiresAt,
    });

    res.redirect(`${config.frontendUrl}/dashboard`);
  } catch (error) {
    console.error('OAuth Callback error:', error);
    res.redirect(`${config.frontendUrl}/login?error=oauth_failed`);
  }
});

// Direct token authentication (Google One-Tap / Google Sign-In button credential)
router.post('/google/token', async (req: Request, res: Response, next) => {
  try {
    const { credential } = req.body;
    if (!credential) {
      return res.status(400).json({ error: 'Google credential token is required' });
    }

    const userInfo = await verifyGoogleCredentialToken(credential);
    const { user, token, expiresAt } = await findOrCreateUserAndCreateSession(userInfo);

    // Set HTTP-only cookie
    res.cookie('balance_token', token, {
      httpOnly: true,
      secure: config.isProduction,
      sameSite: config.isProduction ? 'strict' : 'lax',
      expires: expiresAt,
    });

    res.json({ user, token });
  } catch (error) {
    next(error);
  }
});

// Get current authenticated user
router.get('/me', authenticate, (req: Request, res: Response) => {
  res.json({ user: req.user });
});

// Logout
router.post('/logout', authenticate, async (req: Request, res: Response, next) => {
  try {
    if (req.sessionToken) {
      await terminateSession(req.sessionToken);
    }

    res.clearCookie('balance_token', {
      httpOnly: true,
      secure: config.isProduction,
      sameSite: config.isProduction ? 'strict' : 'lax',
    });

    res.json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    next(error);
  }
});

export default router;

