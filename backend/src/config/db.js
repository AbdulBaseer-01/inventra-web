const mongoose = require("mongoose");

let connectionPromise;

const connectDB = async () => {
    if (!process.env.MONGO_URI) {
        throw new Error("MONGO_URI is not configured");
    }

    if (mongoose.connection.readyState === 1) {
        return mongoose.connection;
    }

    if (connectionPromise) {
        return connectionPromise;
    }

    connectionPromise = mongoose.connect(process.env.MONGO_URI, {
        dbName: "storedata",
        serverSelectionTimeoutMS: 10000
    })
        .then((mongooseInstance) => {
            console.log("MongoDB Connected!!");
            return mongooseInstance.connection;
        })
        .catch((error) => {
            throw new Error(`MongoDB connection failed: ${error.message}`);
        })
        .finally(() => {
            connectionPromise = undefined;
        });

    try {
        return await connectionPromise;
    } catch (error) {
        throw error;
    }
};

module.exports = connectDB;