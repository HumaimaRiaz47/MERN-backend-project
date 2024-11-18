import express from "express";
const app = express();
import cookieParser from "cookie-parser";
import cors from "cors";

app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true
}))

app.use(express.json({limit: '16kb'}))
app.use(express.urlencoded({extended: true}))
app.use(express.static("public"))
app.use(cookieParser())

//import routes
import userRouter from './routes/user.routes.js'

//routes description
app.use("/api/v1/users", userRouter)

//http://localhost:8000/api/v1/users/register


export { app }