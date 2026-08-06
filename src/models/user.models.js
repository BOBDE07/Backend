import mongoose from "mongoose";
import jwt from "jsonwebtoken"
import bcrypt from "bcrypt"


const userSchema = new mongoose.Schema({
    userName : {
        type: String , 
        required: true , 
        unique : true , 
        minlength: 3 , 
        maxlength : 15 ,
        trim: true ,
        index : true  // for searching
    }, 
    email :{
        type: String , 
        required: true , 
        unique : true , 
        lowercase: true ,
        trim: true
    }, 
    password: {
        type: String , 
        required: true , 
        minlength:[6, "Minimum Passwrod length should be 6"] , 
        maxlength:[12 , "Maximum Password Length should be 12"]  
    },
    fullName : {
        type: String , 
        required: true ,
        trim : true , 
        index: true 
    }, 
    coverImage: {
        type: String , // cluodinary
        required: true 
    }, 
    avatar: {
        type: String , // cluodinary url 
        required : true  
    }, 
    watchHistory : [ 
        {
            type: mongoose.Schema.Types.ObjectId, 
            ref:"Video"
        }
    ], 
    refreshToken: {
        type:String
    }
} , {timestamps: true})

// middleware - password ko bcrypt krke save kr rhe hai 
userSchema.pre("save", async function (next) {
    // password update nhi hua to next mei jao 
    if(!this.isModified("password")){
        return next() 
    }
    this.password = brycpt.hash(this.password , 10)
    next()
}) 

// password or bcrypt password ko compare kr rhe hai 
userSchema.methods.isPasswordCorrect = async function(password) {
    return await brycpt.compare(password , this.password)
}

userSchema.methods.generateAccessToken = function() {
    return jwt.sign(
        {
            _id: this._id ,  // _id - ye hame mongodb se milegi 
            email: this.email , 
            userName: this.userName,
            fullName: this.fullName
        },
        process.env.ACCESS_TOKEN_SECRET,{
            expiresIn: process.env.ACCESS_TOKEN_EXPIRY
        }
    )
}


userSchema.methods.generateRefreshToken = function() {
    return jwt.sign(
        {
            _id: this._id ,  // _id - ye hame mongodb se milegi 
            
        },
        process.env.REFRESH_TOKEN_SECRET,{
            expiresIn: process.env.REFRESH_TOKEN_EXPIRY
        }
    )
}


export const User = mongoose.model("User" , userSchema)