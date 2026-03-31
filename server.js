const express = require('express');
const cors = require('cors');
const path = require('path');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const logger = require('./src/utils/logger');
const authRoutes = require('./src/routes/auth');
const leadsRoutes = require('./src/routes/leads');
const paymentRoutes = require('./src/routes/payment');
const telegramRoutes = require('./src/routes/telegram');
const magnetRoutes = require('./src/routes/magnet');

const app = express();
const PORT = process.env.PORT || 3000;

// Rate Limiting (Prevent Spam)
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    limit: 50, // Limit each IP to 50 requests per `window`
    message: { error: 'Too many requests, please try again later.' }
});

// Middleware
app.use(cors());

// Avoid express.json() for the Stripe webhook so we have raw body for signature validation
app.use('/api/payment', paymentRoutes); 

app.use(express.json());
app.use(limiter);

// Serve static frontend files (assumes frontend is in root and admin is at /admin)
app.use(express.static(__dirname));

// Mount Routers
app.use('/api/auth', authRoutes);
app.use('/api/leads', leadsRoutes);
app.use('/api/telegram', telegramRoutes);
app.use('/api/magnet', magnetRoutes);

// Fallback Routes
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'gym.html')));
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'admin.html')));

// Global Error Handler
app.use((err, req, res, next) => {
    logger.error(`Unhandled Exception: ${err.message}`, { stack: err.stack });
    res.status(500).json({ error: 'Internal Server Error' });
});

// Start Server
app.listen(PORT, () => {
    logger.info(`🚀 Production FitPro Backend running on http://localhost:${PORT}`);
});
