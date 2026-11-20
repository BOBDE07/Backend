// 1. how to upload video 
// 2. views on video 
// 3. comments on video 
// 4. popular videos
// 5. create playlist of video 
// 6. get all videos of owner or user
// 7. get all playlist 
// 8. get video 
// 9. get playlist 
// 10. delete video , delete playlist , delete comment
// 11. edit title , description, thumbnail , comment
// 12. share video - create a link 
// 13. likes and dislikes of video

import asyncHandler from "../utils/asyncHandler.util.js";
import { User } from '../models/user.model.js' 
import { Video } from "../models/video.model.js";
import ApiError from "../utils/apiError.util.js";
import ApiResponse from '../utils/apiResponse.util.js'
import  uploadOnCloudinary from "../utils/cloudinary.util.js";
import mongoose from "mongoose";
import { v2 as cloudinary } from "cloudinary";

const uploadVideo = asyncHandler(async ( req , res ) =>{
    /*
    1. Receive video details.
    2. Get files uploaded through Multer.
    3. Upload files to Cloudinary.
    4. Get Cloudinary URLs.
    5. Find the logged-in user.
    6. Create a Video document.
    7. Return the response.
    */

    /* 
    upload.fields([
        { name: "videoFile", maxCount: 1 },
        { name: "thumbnail", maxCount: 1 }
    ]) // put this in middleware
     */
    const { title , description} = req.body 
    
    if(!title || !description ) {
        throw new ApiError(400, "All fields are required")    
    }    
    // check if the file is exist in the request (optional here because of multer we already do this in the middleware)
    const thumbnailLocalPath = req.files?.thumbnail?.[0]?.path
    const videoLocalPath = req.files?.videoFile?.[0]?.path

    if(!thumbnailLocalPath || !videoLocalPath) {
        throw new ApiError(400 , "File is missing.")
    }

    // const video = await Promise.uploadOnCloudinary(videoLocalPath ) ; 
    // const thumbnail = await Promise.uploadOnCloudinary(thumbnailLocalPath) ; 

    const [video , thumbnail] = await Promise.all([uploadOnCloudinary(videoLocalPath) , uploadOnCloudinary(thumbnailLocalPath)])

    if(!video ) {
        throw new ApiError(400 , 'Video file is not recieved. please upload again.')
    }    
    if(!thumbnail ) {
        throw new ApiError(400 , 'Thumbnail file is not recieved. please upload again.')
    }

    const videoURL = video.url 
    const thumbnailURL = thumbnail.url 

    const user = await User.findById(req.user?._id) ;

    if(!user) {
        throw new ApiError(404 , 'User is not found.')     
    }

    const newVideo = await Video.create({
        title : title , 
        description : description , 
        thumbnail : thumbnailURL , 
        videoFile : videoURL , 
        owner : user._id
    })
    return res 
        .status(200)
        .json(new ApiResponse(201 , newVideo , 'Video uploaded successfully.'))
    
})

const getAllVideos = asyncHandler( async ( req , res ) => {
    // 1. Find the user
    const user = await User.findById(req.user?._id) ;

    if(!user) {
        throw new ApiError(404, 'User not found.')
    } 

    // 2. Find all videos where owner matches the userId
    const videos = await Video.find({ owner: user._id }) ;

    // 3. Return those videos
    return res
        .status(200)
        .json(new ApiResponse(200, videos, 'Videos fetched successfully.'))
})


const deleteVideo = asyncHandler(async (req, res) => {

    // 1. Get authenticated user's ID
    const userId = req.user?._id;

    if (!userId) {
        throw new ApiError(401, "Unauthorized user.");
    }

    // 2. Get video ID from request params
    const { videoId } = req.params;

    // 3. Validate MongoDB ObjectId
    if (!mongoose.isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video ID.");
    }

    // 4. Find video and verify ownership
    const video = await Video.findOne({
        _id: videoId,
        owner: userId
    });

    if (!video) {
        throw new ApiError(
            404,
            "Video not found or you are not authorized to delete it."
        );
    }

    // 5. Check Cloudinary public IDs
    if (!video.videoPublicId || !video.thumbnailPublicId) {
        throw new ApiError(
            500,
            "Cloudinary file information is missing for this video."
        );
    }

    // 6. Delete video and thumbnail from Cloudinary
    // Promise.allSettled ensures both deletion attempts are made,
    // even if one of them fails.
    const cloudinaryResults = await Promise.allSettled([
        cloudinary.uploader.destroy(
            video.videoPublicId,
            { resource_type: "video" }
        ),

        cloudinary.uploader.destroy(
            video.thumbnailPublicId,
            { resource_type: "image" }
        )
    ]);

    // 7. Check Cloudinary deletion results
    const deletionErrors = [];

    cloudinaryResults.forEach((result, index) => {

        if (result.status === "rejected") {
            deletionErrors.push(result.reason);
            return;
        }

        const cloudinaryResult = result.value?.result;

        // "not found" is also acceptable:
        // the asset may already have been deleted during an earlier attempt.
        if (
            cloudinaryResult !== "ok" &&
            cloudinaryResult !== "not found"
        ) {
            deletionErrors.push(
                new Error(`Cloudinary deletion failed for asset ${index + 1}`)
            );
        }
    });

    // 8. If Cloudinary deletion failed, keep the MongoDB record.
    // This allows the deletion operation to be retried.
    if (deletionErrors.length > 0) {
        console.error("Cloudinary deletion errors:", deletionErrors);

        throw new ApiError(
            502,
            "Failed to delete video files from Cloudinary. Please retry."
        );
    }

    // 9. Delete the MongoDB document only after Cloudinary succeeds
    const deletedVideo = await Video.findOneAndDelete({
        _id: videoId,
        owner: userId
    });

    if (!deletedVideo) {
        throw new ApiError(
            404,
            "Video was already deleted or is no longer available."
        );
    }

    // 10. Return success response
    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                {},
                "Video and associated files deleted successfully."
            )
        );
});


const getVideoById = asyncHandler(async (req, res) => {
    // 1. Find the videoId from params
    const { videoId } = req.params;

    // 2. Find video — throw error if not found
    const video = await Video.findById(videoId);
    if (!video) {
        throw new ApiError(404, 'Video not found.');
    }

    // 3. Return the video
    return res
        .status(200)
        .json(new ApiResponse(200, video, 'Video fetched successfully.'));
})


const updateVideoTitle = asyncHandler(async (req, res) => {

    // 1. Get the authenticated user's ID
    const userId = req.user._id;

    // 2. Get video ID from request params
    const { videoId } = req.params;

    // 3. Validate video ID
    if (!mongoose.isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video ID.");
    }

    // 4. Get description from request body
    const { title } = req.body;

    // 5. Validate description
    if (typeof title !== "string" || !title.trim()) {
        throw new ApiError(400, "title is required.");
    }

    // 6. Find and update video only if it belongs to this user
    const updatedTitle = await Video.findOneAndUpdate(
        {
            _id: videoId,
            owner: userId
        },
        {
            $set: {
                title: title.trim()
            }
        },
        {
            new: true,
            runValidators: true
        }
    );

    // 7. Handle video not found or ownership mismatch
    if (!updatedTitle) {
        throw new ApiError(404, "Video not found or you are not authorized to update it.");
    }

    // 8. Return updated video
    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                updatedTitle,
                "title updated successfully."
            )
        );
});



const updateVideoDescription = asyncHandler(async (req, res) => {

    // 1. Get the authenticated user's ID
    const userId = req.user._id;

    // 2. Get video ID from request params
    const { videoId } = req.params;

    // 3. Validate video ID
    if (!mongoose.isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video ID.");
    }

    // 4. Get description from request body
    const { description } = req.body;

    // 5. Validate description
    if (typeof description !== "string" || !description.trim()) {
        throw new ApiError(400, "Description is required.");
    }

    // 6. Find and update video only if it belongs to this user
    const updatedDescription = await Video.findOneAndUpdate(
        {
            _id: videoId,
            owner: userId
        },
        {
            $set: {
                description: description.trim()
            }
        },
        {
            new: true,
            runValidators: true
        }
    );

    // 7. Handle video not found or ownership mismatch
    if (!updatedDescription) {
        throw new ApiError(404, "Video not found or you are not authorized to update it.");
    }

    // 8. Return updated video
    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                updatedDescription,
                "Description updated successfully."
            )
        );
});


const uploadNewThumbnail = asyncHandler(async (req, res) => {
    // 1. Get authenticated user's ID
    const userId = req.user?._id;

    if (!userId) {
        throw new ApiError(401, "Unauthorized user.");
    }

    // 2. Get video ID from request params
    const { videoId } = req.params;

    // 3. Validate MongoDB ObjectId
    if (!mongoose.isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video ID.");
    }

    // 4. Find video and verify ownership
    const video = await Video.findOne({
        _id: videoId,
        owner: userId
    });

    if (!video) {
        throw new ApiError(404, "Video not found or you are not authorized.");
    }

    // 5. Get new thumbnail's local path
    const thumbnailLocalPath = req.file?.path;

    if (!thumbnailLocalPath) {
        throw new ApiError(400, "Thumbnail file is missing.");
    }

    // 6. Upload new thumbnail to Cloudinary
    const newThumbnail = await uploadOnCloudinary(thumbnailLocalPath);

    if (!newThumbnail?.secure_url || !newThumbnail?.public_id) {
        throw new ApiError(500, "Failed to upload thumbnail.");
    }

    // 7. Preserve old thumbnail URL before updating
    const oldThumbnailUrl = video.thumbnail;

    // 8. Update MongoDB with the new thumbnail
    video.thumbnail = newThumbnail.secure_url;
    await video.save();

    // 9. Delete old thumbnail from Cloudinary
    // This happens AFTER the database update to avoid a broken old URL
    if (oldThumbnailUrl) {
        try {
            const oldPublicId = extractCloudinaryPublicId(oldThumbnailUrl);

            if (oldPublicId) {
                await cloudinary.uploader.destroy(oldPublicId);
            }
        } catch (error) {
            // New thumbnail is already saved.
            // Log the failure so old image cleanup can be retried.
            console.error("Failed to delete old thumbnail:", error);
        }
    }

    // 10. Return updated video
    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                video,
                "Thumbnail updated successfully."
            )
        );
});




export {
    uploadVideo ,
    getAllVideos ,
    getVideoById ,
    deleteVideo , 
    updateVideoTitle , 
    updateVideoDescription,
    uploadNewThumbnail
}