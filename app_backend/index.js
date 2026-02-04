require('dotenv').config();
const express = require('express');
const rateLimit = require('express-rate-limit');
const { createRateLimitHandler } = require('./src/utils/rateLimitHandler');
const connectDB = require('./src/config/db');
const cors = require('cors');
const helmet = require('helmet');

const authRoutes = require('./src/routes/authRoutes');
const attendanceRoutes = require('./src/routes/attendanceRoutes');
const dashboardRoutes = require('./src/routes/dashboardRoutes');
const requestRoutes = require('./src/routes/requestRoutes');
const loanRoutes = require('./src/routes/loanRoutes');
const payrollRoutes = require('./src/routes/payrollRoutes');
const chatbotRoutes = require('./src/routes/chatbotRoutes');
const holidayRoutes = require('./src/routes/holidayRoutes');
const onboardingRoutes = require('./src/routes/onboardingRoutes');
const assetsRoutes = require('./src/routes/assetsRoutes');
const taskRoutes = require('./src/routes/taskRoutes');
const customerRoutes = require('./src/routes/customerRoutes');

const app = express();
app.set('trust proxy', 1);

app.use(helmet());
//cors
// Configure CORS
//**const allowedOrigins = ['https://ehrms.askeva.io', 'http://ehrms.askeva.io', 'http://localhost:8080', 'http://127.0.0.1:8080'];

// Configure CORS
const allowedOrigins = ['https://ehrms.askeva.net', 'http://ehrms.askeva.net', 'http://localhost:8080', 'http://127.0.0.1:8080'];

app.use(cors({
    origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        if (origin.startsWith('http://localhost') || origin.startsWith('http://127.0.0.1')) {
            return callback(null, true);
        }
        if (allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true
}));

app.use(express.json({ limit: '50mb' }));

// Root / health check – avoids 404 for GET / (load balancers, uptime checks)
app.get('/', (req, res) => {
    res.json({ ok: true, message: 'Server is running', service: 'hrms-api' });
});

// Global API rate limit: 400 req/min per IP (applies to all /api/*)
const globalApiLimiter = rateLimit({
    windowMs: 1 * 60 * 1000,
    limit: 400,
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => req.path === '/',
    handler: createRateLimitHandler('Too many requests. Please try again later.')
});
app.use(globalApiLimiter);

// Routes (per-route limiters are stricter for auth/attendance/dashboard)
console.log('[Server] Registering routes...');
app.use('/api/auth', authRoutes);
console.log('[Server] Auth routes registered at /api/auth');
app.use('/api/attendance', attendanceRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/requests', requestRoutes);
app.use('/api/loans', loanRoutes);
app.use('/api/payrolls', payrollRoutes);
app.use('/api/chatbot', chatbotRoutes);
app.use('/api/holidays', holidayRoutes);
app.use('/api/onboarding', onboardingRoutes);
app.use('/api/tasks', taskRoutes);
console.log('[Server] Task routes registered at /api/tasks');
app.use('/api/customers', customerRoutes);
app.use('/api/assets', assetsRoutes);
app.use('/api/onboarding/customers', customerRoutes);
console.log('[Server] Customer routes registered at /api/onboarding/customers');

// Debug: Log all incoming requests (only in development)
if (process.env.NODE_ENV !== 'production') {
    app.use((req, res, next) => {
        console.log(`[Route Debug] ${req.method} ${req.path}`);
        next();
    });
}

// 404 handler - should return JSON, not HTML
// Use console.log for 404s so PM2 error log isn't flooded by bot/scanner probes (/, /dns-query, /actuator/..., etc.)
app.use((req, res) => {
    if (process.env.NODE_ENV !== 'production') {
        console.log(`[404] Route not found: ${req.method} ${req.path}`);
    }
    res.status(404).json({
        success: false,
        error: { message: `Route not found: ${req.method} ${req.path}` }
    });
});

const PORT = process.env.PORT || 5000;

// Start Server
const startServer = async () => {
    try {
        await connectDB();
        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });
    } catch (error) {
        console.error('Failed to start server:', error.message);
        process.exit(1);
    }
};

startServer();