const jwt = require('jsonwebtoken');

/**
 * Generate a JWT token for the given user.
 */
function generateToken(user) {
  return jwt.sign(
    {
      id: user._id || user.id,
      email: user.email,
      name: user.name,
      avatar: user.avatar,
    },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
}

/**
 * Express middleware — verifies the JWT from the Authorization header or cookie.
 */
function authMiddleware(req, res, next) {
  const token =
    req.cookies?.token ||
    req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

module.exports = { generateToken, authMiddleware };
