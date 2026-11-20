import mongoose from "mongoose";
import { User } from '../models/user.model.js' 
import { Video } from '../models/video.model.js'
import { Comment } from "../models/comment.model.js";
import ApiError from '../utils/apiError.util.js' 
import ApiResponse from '../utils/apiResponse.util.js'
import asyncHandler from "../utils/asyncHandler.util.js";


const createComment = asyncHandler(async ( req , res ) => {
    const { content } = req.body ;

    if(!content){
        throw new ApiError (400, 'Content is required in comment.')
    }

    const userId = req.user?._id;
    if(!userId ){
        throw new ApiError(400 ,'User not found in database.')
    }

    const videoId = await Video.findById(req.params.videoId ) ;
    if(!videoId) {
        throw new ApiError(400 , 'Video not found in database.') 
    }

    const newComment = await Comment.create({
        content , 
        owner: userId , 
        video: videoId 
    } )

    return res.status(200).json(new ApiResponse(200 , newComment , 'Comment added successfully.'))
})

const editComment = asyncHandler(async (req, res) => {
    const { content } = req.body;
    const { videoId, commentId } = req.params;

    // 1. Validate content
    if (typeof content !== 'string' || !content.trim()) {
        throw new ApiError(400, 'Comment content is required.');
    }

    // 2. Get authenticated user
    const userId = req.user?._id;

    if (!userId) {
        throw new ApiError(401, 'Unauthorized request.');
    }

    // 3. Validate video ID
    if (!mongoose.isValidObjectId(videoId)) {
        throw new ApiError(400, 'Invalid video ID.');
    }

    // 4. Validate comment ID
    if (!mongoose.isValidObjectId(commentId)) {
        throw new ApiError(400, 'Invalid comment ID.');
    }

    // 5. Check video existence
    const video = await Video.findById(videoId);

    if (!video) {
        throw new ApiError(404, 'Video not found.');
    }

    // 6. Find comment
    const comment = await Comment.findById(commentId);

    if (!comment) {
        throw new ApiError(404, 'Comment not found.');
    }

    // 7. Verify comment belongs to requested video
    if (comment.video.toString() !== video._id.toString()) {
        throw new ApiError(400, 'Comment does not belong to this video.');
    }

    // 8. Verify comment ownership
    if (comment.owner?.toString() !== userId.toString()) {
        throw new ApiError(403, 'You are not authorized to edit this comment.');
    }

    // 9. Update comment
    const updatedComment = await Comment.findOneAndUpdate(
        {
            _id: commentId,
            video: videoId,
            owner: userId
        },
        {
            $set: {
                content: content.trim()
            }
        },
        {
            new: true,
            runValidators: true
        }
    );

    if (!updatedComment) {
        throw new ApiError(404, 'Comment could not be updated.');
    }

    // 10. Send response
    return res.status(200).json(
        new ApiResponse(
            200,
            updatedComment,
            'Comment updated successfully.'
        )
    );
});

const getAllComment = asyncHandler(async (req, res) => {
    const { videoId } = req.params;

    // 1. Validate videoId format
    if (!mongoose.isValidObjectId(videoId)) {
        throw new ApiError(400, 'Invalid video ID.');
    }

    // 2. Check if video exists
    const video = await Video.findById(videoId);
    if (!video) {
        throw new ApiError(404, 'Video not found.');
    }

    // 3. Find all comments where video matches the videoId
    const comments = await Comment.find({ video: videoId });

    // 4. Return comments
    return res
        .status(200)
        .json(new ApiResponse(200, comments, 'Comments fetched successfully.'));
});



const deleteComment = asyncHandler(async (req, res) => {
    const { commentId } = req.params;

    // 1. Validate comment ID
    if (!mongoose.isValidObjectId(commentId)) {
        throw new ApiError(400, 'Invalid comment ID.');
    }

    // 2. Authenticate user
    const userId = req.user?._id;

    if (!userId) {
        throw new ApiError(401, 'Unauthorized request.');
    }

    // 3. Delete comment only if user owns it
    const deletedComment = await Comment.findOneAndDelete({
        _id: commentId,
        owner: userId
    });

    if (!deletedComment) {
        throw new ApiError(404, 'Comment not found or you are not authorized to delete it.');
    }

    // 4. Return response
    return res.status(200).json(
        new ApiResponse(
            200,
            deletedComment,
            'Comment deleted successfully.'
        )
    );
});



export { 
    createComment ,
    editComment ,
    getAllComment ,
    deleteComment
    
}