import { User } from "../models/user.model.js";
import asyncHandler from "../utils/asyncHandler.util.js";
import ApiError from "../utils/apiError.util.js";
import uploadOnCloudinary from "../utils/cloudinary.util.js";
import ApiResponse from "../utils/apiResponse.util.js";
import jwt from 'jsonwebtoken'

const generateAccessAndRefreshToken= async (userId) => {
    try {
        const user = await User.findById(userId) ; 
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        user.refreshToken = refreshToken
        await user.save({ validateBeforeSave: false }) 

        return {accessToken , refreshToken }
    } catch (error) {
        throw new ApiError (500 , 'Something went wrong while generating the access and refresh token')
    }
}

const userRegister = asyncHandler ( async (req , res ) => {
    //  get user details from frontend
    // validation- not empty
    //  check user already exist : username and email
    //  check for images ,check for avatar
    // upload avatar and cover image in cloudinary
    // create user object - create entry in DB
    // remove password and refresh token feild from response
    // check for user creation
    // return res 

    const { fullname , username , email , password } = req.body 

    if(!fullname || !email || !username || !password ) {
        throw new ApiError(400 , "All Feilds are required." ) ;
    }

    // advanced way to check all the feilds are filled or not 
    // if(
    //     [fullname , email , username , password ].some((feild) => feild?.trim === "")
    // ) {
    //     throw new ApiError(400 , 'All feilds are required.') ;
    // }

    const existingUser = await User.findOne({ 
        $or: [{ username }, { email }]     
    })

    // console.log(existingUser);

    if(existingUser ) {
        throw new ApiError(409 , "User is already exist in DB.") ;
    }


    // handle images and cover image 
    const avatarLocalPath = req.files?.avatar[0]?.path  // console.log(req.files?.avatar[0]?.path)
    // const coverImageLocalPath = req.files?.coverImage[0]?.path  // console.log(req.files?.coverImage[0]?.path)

    let coverImageLocalPath ; 
    if( req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0 ){
        coverImageLocalPath = req.files.coverImage[0].path
    }

    if(!avatarLocalPath){
        throw new ApiError(400 , 'avatar file is required.') ;
    }
    // if(!coverImageLocalPath){
    //     throw new ApiError(400 , 'cover image file is required.') ;
    // }

    const avatar = await uploadOnCloudinary(avatarLocalPath) ;
    const coverImage = await uploadOnCloudinary(coverImageLocalPath) ;
    if(!avatar){
        throw new ApiError(400 , 'avatar file is required.') ;
    }
    // if(!coverImage){
    //     throw new ApiError(400 , 'cover image file is required.') ;
    // }

    // create User 
    const user = await User.create({
        fullname , 
        email , 
        username, 
        avatar: avatar.url,
        coverImage: coverImage?.url || "" , 
        password 
    })

    const createdUser = await User.findById(user._id).select("-password -refreshtoken") ;
    if(!createdUser) {
        throw new ApiError(500 , 'Something went wrong while registering the user.')
    }

    return res.status(200).json (
        new ApiResponse(201 , createdUser , 'User registed successfully.')
    )

})

const userLogin = asyncHandler ( async ( req , res ) => {
    // get username , email , password from frontend req.body
    // check the username , email , password is filled or not
    // find user in DB 
    // if user not present in DB then throw error
    // password check 
    // access token and refresh token
    // send in cookies 
    // send response 

    const { username , email , password } = req.body

    if(!email || !username || !password ) {
        throw new ApiError(400 , 'All feilds are required.')
    }

    const user = await User.findOne ( {
        $or: [{ username } , { email }]
    } )

    if(!user ) {
        throw new ApiError(400, 'User is not registered.') ; 
    }

    const isPasswordCorrect = await user.isPassword(password) ; 
    if(!isPasswordCorrect) {
        throw new ApiError (401 , 'Invalid credentials') ; 
    }
    
    const { accessToken , refreshToken } = await generateAccessAndRefreshToken(user._id)

    const LoggedInUser = await User.findById(user._id).select("-password -refreshToken")

    const options = {
        httpOnly : true , 
        secure: true 
    }

    return res
    .status(200)
    .cookie("accessToken" , accessToken , options) 
    .cookie("refreshToken" , refreshToken , options) 
    .json(
        new ApiResponse(200 , {
            user: LoggedInUser , accessToken , refreshToken
        } , "User LoggedIn successfully.")
    )

})


const userLogOut = asyncHandler(async ( req , res , next ) => {
    const user = req.user._id ; 

    await User.findByIdAndUpdate(
        user ,
        {
            $set: {
                refreshToken: undefined 
            }
        }, 
        {
            new :true 
        }
    )

    const options = {
        httpOnly: true , 
        secure: true 
    }

    return res
            .status(200)
            .clearCookie('accessToken' , options)
            .clearCookie('refreshToken', options)
            .json(
                new ApiResponse(200 , {} , 'User logged Out successfully.')
            )
})


const refreshAccessToken = asyncHandler (async ( req , res ) => {
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken ; 

    if(incomingRefreshToken) {
        throw new ApiError(400 , "Unauthorized request.") ;
    }

    try {
        const decodedToken = jwt.verify(
            incomingRefreshToken , 
            process.env.REFRESH_TOKEN_SECRET
        )
        
        const user = await User.findById(decodedToken?._id) 
    
        if(!user) {
            throw new ApiError(400 , 'Invalid refresh token.') ;
        }
    
        if(incomingRefreshToken != user?.refreshToken ){
            throw new ApiError(401 , 'Refresh token is  expiried or used ')
        }
    
        const options = {
            httpOnly: true , 
            secure: true 
        }
    
        const {accessToken , newRefreshToken } = await generateAccessAndRefreshToken(user._id)
    
        return res
                .status(200)
                .cookies('accessToken' , accessToken , options) 
                .cookies('refreshToken' , refreshToken , options)
                .json(
                    new ApiResponse (
                        200 , 
                        {accessToken , refreshToken: newRefreshToken} , 
                        'Access token refreshed successfully.'
                    )
                )
    } catch (error) {
        throw new ApiError(400 , error.message || 'Invalid refresh token.') ;     
    }

})

export {
    userRegister,
    userLogin ,
    userLogOut ,
    refreshAccessToken
}