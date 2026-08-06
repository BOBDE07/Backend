import express from "express" 
import cors from "cors"
import cookieParser from "cookie-parser"

const app = express() 

// use method ko middlewares mei use krte hai 
app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true ,

})) 

app.use(express.json({limit: "16kb"})) // json limit 

app.use(express.urlencoded({extended: true , limit: "16kb"})) // extended ke andar object ke andar object de skte hai 

app.use(express.static("public"))

app.use(cookieParser())


// routes import 
import userRouter from './routes/user.routes.js'

// routes declaration 
app.use("/api/v1/users" , userRouter )
// prefix is "/user"
// http://localhost:8000/api/v1/user/register
export { app }