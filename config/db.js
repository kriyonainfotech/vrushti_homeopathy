const mongoose = require("mongoose");

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGO_URI, {
            serverSelectionTimeoutMS: 30000,  // optional
            socketTimeoutMS: 45000,            // optional
            connectTimeoutMS: 30000,           // optional
            // ❌ Removed useNewUrlParser and useUnifiedTopology
        });

        console.log(`MongoDB Connected: ${conn.connection.host}`);
    } catch (err) {
        console.error("[MongoDB Error]", err.message);
        process.exit(1);
    }
};

module.exports = connectDB;
