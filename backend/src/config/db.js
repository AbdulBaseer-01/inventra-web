const mongoose = require("mongoose");

const connectDB = async () => {
    if (!process.env.MONGO_URI) {
        throw new Error("MONGO_URI is not configured");
    }

    try {
        const conn = await mongoose.connect(process.env.MONGO_URI, { dbName: "storedata" });

        console.log(
            `MongoDB Connected!!`
        );

    } catch (error) {
        throw new Error(`MongoDB connection failed: ${error.message}`);
    }
};

module.exports = connectDB;