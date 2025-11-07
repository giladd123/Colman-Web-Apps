const mongoose = require("mongoose");
require("dotenv").config();

const connectDB = async () => {
  try {
    await mongoose.connect("mongodb+srv://<user>:<password>@webcluster.ywjnajg.mongodb.net/Netflix?retryWrites=true&w=majority", {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log("MongoDB connected successfully");
  } 
  catch (error) {
    console.error("MongoDB connection error:", error);
    // Stop the server if the DB fails
    process.exit(1);
  }
};

module.exports = connectDB;