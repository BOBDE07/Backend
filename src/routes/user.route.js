import { Router } from "express";
import { userLogOut, userLogin, userRegister ,refreshAccessToken, changeCurrentPassword, getCurrentUser, updateAccountDetails, updateUserAvatar, updateUserCoverImage, getUserChannelProfile, getWatchHistory } from "../controllers/user.controller.js";
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

userRouter.post('/change-password', verifyJWT , changeCurrentPassword )

userRouter.get('/current-user' , verifyJWT, getCurrentUser)

userRouter.patch('/update-details' , verifyJWT , updateAccountDetails) 

userRouter.patch('/avatar-change' , verifyJWT , upload.single("avatar"), updateUserAvatar)

userRouter.patch('/coverIamge-change' , verifyJWT , upload.single("/coverImage"), updateUserCoverImage)

userRouter.get('/c/:username' , verifyJWT , getUserChannelProfile) 

userRouter.get('/watchHistory', verifyJWT , getWatchHistory )


export default userRouter ;