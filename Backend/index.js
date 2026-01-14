require('dotenv').config();
const express = require('express');
const connectDB = require('./src/config/db');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const authRoutes = require('./src/routes/authRoutes');
const attendanceRoutes = require('./src/routes/attendanceRoutes');
const dashboardRoutes = require('./src/routes/dashboardRoutes'); // Import dashboard routes
const requestRoutes = require('./src/routes/requestRoutes'); // Import requestRoutes
// Connect to Database
connectDB().catch(err => {
    console.error('Database Connection Failed:', err);
});

const app = express();

// Security Middleware
app.use(helmet()); // Sets generic security headers
app.use(cors());   // Restrict domains in production
app.use(express.json({ limit: '50mb' })); // Parse JSON bodies with increased limit for Base64 images

// Rate Limiting (Brute Force Protection)
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later'
});
app.use(limiter);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/dashboard', dashboardRoutes); // Use dashboard routes
app.use('/api/requests', requestRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));