const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const express = require('express');
const cors = require('cors');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const connectDB = require('./config/db');
const { passport } = require('./config/passport');
const authRoutes = require('./routes/auth');
const documentRoutes = require('./routes/documents');
const chatRoutes = require('./routes/chat');

const app = express();
const PORT = process.env.PORT || 5000;
const allowedOrigins = (process.env.CLIENT_URL || '')
  .split(',')
  .map((url) => url.trim().replace(/\/$/, ''))
  .filter(Boolean);

// ─── Connect to MongoDB ─────────────────────────────────────────────
connectDB();

// ─── Middleware ──────────────────────────────────────────────────────
app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (like mobile apps or curl)
      if (!origin) return callback(null, true);
      // Allow any localhost port
      if (/^http:\/\/localhost:\d+$/.test(origin)) return callback(null, true);
      // Allow one or more configured frontend URLs in development and production.
      if (allowedOrigins.includes(origin)) return callback(null, true);
      callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
  })
);
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(cookieParser());
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
  })
);
app.use(passport.initialize());
app.use(passport.session());

// ─── Routes ─────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/chat', chatRoutes);

app.get('/', (_req, res) => {
  res.json({ status: 'ok', message: 'DocuMind API is running' });
});

// ─── Start ──────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
