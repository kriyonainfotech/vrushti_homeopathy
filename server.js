const express = require("express");
const connectDB = require("./config/db");
require("dotenv").config();

const app = express();

// Middleware
app.use(express.json());

// Connect DB
connectDB();

// Routes
app.use("/api", require("./routes/indexRoute"));

app.get("/", (req, res) => {
    res.send("API is running...");
});

// Start Server
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
