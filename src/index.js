import dotenv from "dotenv";
import connectDB from "./db/index.js";
import cookieParser from "cookie-parser";
import cors from "cors";

dotenv.config({
    path: './env'
})

app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true
}))

app.use(express.json({limit: '16kb'}))
app.use(express.urlencoded({extended: true}))
app.use(express.static("public"))
app.use(cookieParser())

connectDB()
.then(() => {
    app.listen(process.env.PORT || 8000, () => {
        console.log(`server is running ${process.env.PORT}`)
    })
})
.catch((err) => {
    console.log("mongodb is not connected", err);
    
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