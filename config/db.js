const mongoose = require("mongoose");

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGO_URI, {
            serverSelectionTimeoutMS: 30000,  // ⬅️ Increase timeout to 30 sec
            socketTimeoutMS: 45000,          // ⬅️ Avoid early disconnect
            connectTimeoutMS: 30000,         // ⬅️ More time to establish connection
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });

        console.log(`MongoDB Connected: ${conn.connection.host}`);
    } catch (err) {
        console.error("[MongoDB Error]", err.message);
        process.exit(1);
    }
};

module.exports = connectDB;
