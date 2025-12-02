// const mongoose = require("mongoose");

// const connectDB = async () => {
//     try {
//         const conn = await mongoose.connect(process.env.MONGO_URI, {
//             serverSelectionTimeoutMS: 30000,  // optional
//             socketTimeoutMS: 45000,            // optional
//             connectTimeoutMS: 30000,           // optional
//             // ❌ Removed useNewUrlParser and useUnifiedTopology
//         });

//         console.log(`MongoDB Connected: ${conn.connection.host}`);
//     } catch (err) {
//         console.error("[MongoDB Error]", err.message);
//         process.exit(1);
//     }
// };

// module.exports = connectDB;

const mongoose = require("mongoose");

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGO_URI, {
            // Timeouts in milliseconds
            serverSelectionTimeoutMS: 60000, // 60 seconds → time to find a suitable server
            socketTimeoutMS: 120000,         // 2 minutes → time to wait for responses
            connectTimeoutMS: 60000,         // 60 seconds → time to establish connection

            // Recommended options
            autoIndex: true,                 // Build indexes automatically
            maxPoolSize: 10,                 // Max connections in pool
            minPoolSize: 2,                  // Min connections
            // useNewUrlParser & useUnifiedTopology are default in Mongoose 6+
        });

        console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    } catch (err) {
        console.error("❌ [MongoDB Error]", err.message);
        process.exit(1);
    }
};

module.exports = connectDB;
