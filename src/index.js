import dotenv from "dotenv";
import connectDB from "./db/index.js";

dotenv.config({
    path: './env'
})




























/*
import express from "express";
const app = express();

( async () => {

    try{

       await mongoose.connect(`${Process.env.MONGODB_URI}/${DB_NAME}`)
        app.on("error", (error) => {
            console.log("ERROR:", error);
            throw err;
            
        })

        app.listen(process.env.PORT, () => {
            console.log(`app is listening at port ${process.env.PORT}`);
            
        })

    } catch (error) {
        console.error("ERROR:", error);
        throw error
        
    }
})()
*/