const { createPostSchema } = require("../middlewares/validator");
const Post = require("../models/postsModel")

exports.getPosts = async (req, res) => {
    const { page } = req.query;
    const postsPerPage = 10;

    try {
        const pageNum = parseInt(page) || 1;

        const result = await Post.findOne()
            .sort({ createdAt: -1 })
            .skip((pageNum - 1) * postsPerPage)
            .limit(postsPerPage)
            .populate({
                path: 'userId',
                select: 'email'
            });

        return res.status(200).json({
            success: true,
            message: 'posts',
            data: result
        });

    } catch (error) {
        return res.status(500).json({success: false, message: error.message});
    }
};

exports.singlePosts = async(req, res) => {
    const {_id} = req.query;
    try{
        
        const existingPost = await Post.findOne({_id})
        .populate({
            path: 'userId',
            select: 'email'
        });
        if(!existingPost){
            return res.status(404).json({success: false, message: 'Post Unavailable'});
        }

        return res.status(200).json({success: true, message: 'single post', data: result})

    } catch(error){
        return res.status(500).json({success: false, message: error.message});
    }
};

exports.createPost = async (req, res) => {
    const {title, description} = req.body;
    const {userId} = req.user;

    try{
        const {error, value} = createPostSchema.validate({title, description, userId});
        if(error){
            return res.status(401).json({success: false, message: error.details[0].message});
        }
        const result = await Post.create({
            title, description, userId,
        })
        return res.status(201).json({success: false, message: 'Created!', data: result})

    } catch(error) {
        return res.status(500).json({success: false, message: error.message});
    }
};

exports.updatePost = async (req, res) => {
    const {_id} = req.query;
    const {title, description} = req.body;
    const {userId} = req.user;

    try{
        const {error, value} = createPostSchema.validate({title, description, userId});
        if(error) {
            return res.status(401).json({success: false, message: error.details[0].message});
        }
        const existingPost = await Post.findOne({_id})
        if(!existingPost){
            return res.status(404).json({success: false, message: 'Post Unavailable'})
        }
        if(existingPost.userId.toString() !== userId){
            return res.status(403).json({success: false, message: 'Unauthorized'});
        }

        existingPost.title = title;
        existingPost.description = description;
        
        const result = await existingPost.save();
        return res.status(200).json({success: false, message: 'Updated!', data: result})

    }catch(error) {
        console.log(error);
    }
}