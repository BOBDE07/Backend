import { Router } from "express";
import { userLogOut, userLogin, userRegister } from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
import verifyJWT from "../middlewares/auth.middleware.js";

const userRouter = Router() ; 

userRouter.post(
    '/register',
    upload.fields([
        {name: 'avatar' , maxCount: 1} , 
        {name: 'coverImage' , maxCount: 1}
    ]) ,
    userRegister
) ;

userRouter.post('/login' , userLogin ) ; 

userRouter.post('/logout' , verifyJWT , userLogOut)

userRouter.post('/refresh-token' , refreshAccessToken)



export default userRouter ;