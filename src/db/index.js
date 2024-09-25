import mongoose from "mongoose";
import { DB_NAME } from "../constants.js";

const connectDB = async () => {
  try {

   const connectionInstance = await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
        console.log(`\n mongoDB is connected ${connectionInstance.process.host}`)


  } catch (error) {
    console.error("mongodb connection failed:", error);
    Process.exit(1);
  }
};

export default connectDB;