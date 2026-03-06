const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGODB_URI);
        console.log(`[Monitoring DB] MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        console.error(`[Monitoring DB] Connection Error: ${error.message}`);
        throw error;
    }
};

module.exports = connectDB;
