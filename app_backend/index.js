require('dotenv').config();
const path = require('path');
const http = require('http');
const express = require('express');
const { Server } = require('socket.io');
const rateLimit = require('express-rate-limit');
const { createRateLimitHandler } = require('./src/utils/rateLimitHandler');
const connectDB = require('./src/config/db');
const cors = require('cors');
const helmet = require('helmet');
//index
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
const formRoutes = require('./src/routes/formRoutes');
const trackingRoutes = require('./src/routes/trackingRoutes');
const customerRoutes = require('./src/routes/customerRoutes');
const pmsRoutes = require('./src/routes/pmsRoutes');
const performanceRoutes = require('./src/routes/performanceRoutes');
const lmsRoutes = require('./src/routes/lmsRoutes');
const notificationRoutes = require('./src/routes/notificationRoutes');
const announcementRoutes = require('./src/routes/announcementRoutes');

const app = express();
app.set('trust proxy', 1);

app.use(helmet());
//cors
// Configure CORS
//**const allowedOrigins = ['https://ehrms.askeva.io', 'http://ehrms.askeva.io', 'http://localhost:8080', 'http://127.0.0.1:8080'];

// Configure CORS – web at hrms.askeva.net, API at ehrms.askeva.net, local dev IPs
const allowedOrigins = [
  
    'https://ehrms.askeva.net', 'http://ehrms.askeva.net',
    'http://localhost:8080', 'http://127.0.0.1:8080',
   
];

app.use(cors({
    origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        if (origin.startsWith('http://localhost') || origin.startsWith('http://127.0.0.1') ||
            origin.startsWith('http://192.168.16.')) {
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

// Serve uploaded files (LMS PDFs/videos, onboarding, task photos, etc.) so GET /uploads/... returns the file
const uploadsDir = path.join(__dirname, 'uploads');
app.use('/uploads', express.static(uploadsDir));

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
app.use('/api/forms', formRoutes);
app.use('/api/tracking', trackingRoutes);
console.log('[Server] Task routes registered at /api/tasks');
console.log('[Server] Tracking routes registered at /api/tracking');
app.use('/api/customers', customerRoutes);
app.use('/api/assets', assetsRoutes);
app.use('/api/onboarding/customers', customerRoutes);
app.use('/api/pms', pmsRoutes);
app.use('/api/performance', performanceRoutes);
app.use('/api/lms', lmsRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/announcements', announcementRoutes);
console.log('[Server] Customer routes registered at /api/onboarding/customers');
console.log('[Server] LMS routes registered at /api/lms');
console.log('[Server] Notification routes registered at /api/notifications');

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

// Start Server with Socket.io for live tracking
const startServer = async () => {
    try {
        await connectDB();
        const server = http.createServer(app);
        const io = new Server(server, {
            cors: {
                origin: (process.env.CORS_ORIGINS || 'https://hrms.askeva.net,http://hrms.askeva.net,https://ehrms.askeva.net,http://ehrms.askeva.net,http://localhost:8080,http://192.168.16.114:3000,http://192.168.16.104:3000').split(','),
                credentials: true,
            },
        });
        app.set('io', io);

        // Socket.io: staff joins task room; admin joins admin room for live tracking
        io.on('connection', (socket) => {
            socket.on('tracking:join', (data) => {
                if (data?.taskId) socket.join(`task:${data.taskId}`);
            });
            socket.on('admin:join', () => {
                socket.join('admin:tracking');
            });
            // Admin tracks a specific staff by staffId (e.g. from 192.168.16.114)
            socket.on('admin:track-staff', (data) => {
                if (data?.staffId) socket.join(`admin:staff:${data.staffId}`);
            });
        });

        server.listen(PORT, () => {
            console.log(`Server running on port ${PORT} (Socket.io enabled)`);
        });
    } catch (error) {
        console.error('Failed to start server:', error.message);
        process.exit(1);
    }
};

startServer();