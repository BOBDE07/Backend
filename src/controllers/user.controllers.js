import { asyncHandler } from "../utils/asyncHandler.js"
import {ApiError} from "../utils/ApiError.js"
import { User } from "../models/user.models.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js"


const registerUser = asyncHandler( async ( req , res , next ) => {
    // get user details frontend 
    // validation (empty username, email, password etc) - not empty
    // check if user already exist (email/ username)
    // check for images check for avatar
    // upload them to cloudinary , avatar
    // create user object - create entry in db 
    // remove password and refresh token field from response 
    // check for user creation 
    // return res

    // user details
    const { fullName , userName , email , password } = req.body 
    // console.log("email: ", email ) 

    //user did not fill the fullname then we return the error 
    // if(fullName === "") {
    //     throw new ApiError(400 , "Fullname is required")
    // }

    // another method to check fullname , email, username, password 
    if([fullName, email, userName, password].some((field)=> 
        field?.trim() === ""
    )) {
        throw new ApiError(400 , "All Field is required")
    }

    // user already existed 
    const existedUser = await User.findOne({
        $or: [{userName} , {email}]
    })
    if(existedUser) {
        throw new ApiError (409 , "User already exist")
    }

    const avatarLocalPath = req.files?.avatar[0]?.path
    const coverImageLocalPath = req.files?.coverImage[0]?.path

    // console.log("req.file: ", req.files) 
    // console.log("req.body: ", req.body) 

    /*let coverImageLocalPath ; 
    if(req.file && Array.isArray(req.files.coverImage) && req.files.coverIamge.length > 0) {
        coverImageLocalPath = req.files.coverIamge[0]?.path
    }*/


    if(!avatarLocalPath) {
        throw new ApiError(400, "avatar file is required")
    }
    const avatar = await uploadOnCloudinary(avatarLocalPath)
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if(!avatar) {
        throw new ApiError(400, "Avatar file is required")
    }
    if(!coverImage){
        throw new ApiError(400, "Cover Image file is required")
    }

    const user = await User.create({
        fullName,
        avatar: avatar.url,
        coverImage: coverImage?.url || "" ,
        email ,
        password , 
        userName : userName.toLowerCase()
    })

    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )

    if(!createdUser){
        throw new ApiError(500 , "Something went wrong while registering the user")
    }

    return res.status(201).json(
        new ApiResponse(201, createdUser , "User registered successfully")
    )
})

export { registerUser }