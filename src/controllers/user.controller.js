import { User } from "../models/user.model.js";
import asyncHandler from "../utils/asyncHandler.util.js";
import ApiError from "../utils/apiError.util.js";
import uploadOnCloudinary from "../utils/cloudinary.util.js";
import ApiResponse from "../utils/apiResponse.util.js";

const userRegister = asyncHandler ( async (req , res , next ) => {
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

    console.log(existingUser);

    if(existingUser ) {
        throw new ApiError(409 , "User is already exist in DB.") ;
    }


    // handle images and cover image 
    const avatarLocalPath = req.files?.avatar[0]?.path  // console.log(req.files?.avatar[0]?.path)
    const coverImageLocalPath = req.files?.coverImage[0]?.path  // console.log(req.files?.coverImage[0]?.path)

    if(!avatarLocalPath){
        throw new ApiError(400 , 'avatar file is required.') ;
    }
    if(!coverImageLocalPath){
        throw new ApiError(400 , 'cover image file is required.') ;
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath) ;
    const coverImage = await uploadOnCloudinary(coverImageLocalPath) ;
    if(!avatar){
        throw new ApiError(400 , 'avatar file is required.') ;
    }
    if(!coverImage){
        throw new ApiError(400 , 'cover image file is required.') ;
    }

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



export {
    userRegister,
}