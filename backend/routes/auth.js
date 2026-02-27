const express = require('express');
const { passport } = require('../config/passport');
const { generateToken, authMiddleware } = require('../utils/jwt');
const User = require('../models/User');

const router = express.Router();

// ─── Local Signup ───────────────────────────────────────────────────
router.post('/signup', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }

    // Check if a user with this email already exists
    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(409).json({ error: 'Email already in use' });
    }

    const user = await User.create({ name, email, password, provider: 'local' });
    const token = generateToken(user);

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.status(201).json({ user, token });
  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).json({ error: 'Server error during signup' });
  }
});

// ─── Local Login ────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    if (user.provider === 'google' && !user.password) {
      return res.status(401).json({
        error: 'This account uses Google sign-in. Please log in with Google.',
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    user.lastLogin = new Date();
    await user.save();

    const token = generateToken(user);

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({ user, token });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error during login' });
  }
});

// ─── Debug: check env vars are loaded ───────────────────────────────
router.get('/debug', (req, res) => {
  res.json({
    clientIdSet: !!process.env.GOOGLE_CLIENT_ID,
    clientIdPrefix: process.env.GOOGLE_CLIENT_ID?.substring(0, 10) + '...',
    secretSet: !!process.env.GOOGLE_CLIENT_SECRET,
    serverUrl: process.env.SERVER_URL,
    callbackUrl: `${process.env.SERVER_URL}/api/auth/google/callback`,
  });
});

// ─── Initiate Google OAuth (preserve `from` in state) ───────────────
router.get('/google', (req, res, next) => {
  const from = req.query.from || '/workspace';
  passport.authenticate('google', {
    scope: ['openid', 'profile', 'email'],
    accessType: 'offline',
    prompt: 'consent',
    state: JSON.stringify({ from }),
  })(req, res, next);
});

// ─── Google OAuth Callback ──────────────────────────────────────────
router.get(
  '/google/callback',
  passport.authenticate('google', {
    failureRedirect: `${process.env.CLIENT_URL}/auth?error=google_failed`,
    session: false,
  }),
  (req, res) => {
    // Generate JWT and redirect to frontend with token
    const token = generateToken(req.user);

    // Set token as an httpOnly cookie as well
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    // Try to preserve original `from` path (passed in state)
    let from = '/workspace';
    try {
      const rawState = req.query.state;
      if (rawState) {
        const parsed = JSON.parse(rawState);
        if (parsed?.from) from = parsed.from;
      }
    } catch (e) {
      // ignore parse errors and fall back to default
    }

    // Redirect to frontend — include token and from
    res.redirect(
      `${process.env.CLIENT_URL}/auth/callback?token=${token}&from=${encodeURIComponent(from)}`
    );
  }
);

// ─── Get Current User ───────────────────────────────────────────────
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ user });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ─── Logout ─────────────────────────────────────────────────────────
router.post('/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ message: 'Logged out successfully' });
});

module.exports = router;
