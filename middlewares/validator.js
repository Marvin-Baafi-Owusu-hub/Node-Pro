const joi = require('joi');

exports.signupSchema = joi.object({
    email: joi.string().min(6).max(60).required().email({
            tlds:{allow:['com', 'net']}
    }),
    password: joi.string().required().pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{8,}$/),
});

exports.signinSchema = joi.object({
    email: joi.string().min(6).max(60).required().email({
            tlds:{allow:['com', 'net']}
    }),
    password: joi.string().required().pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{8,}$/),
});

exports.acceptCodeSchema = joi.object({
    email: joi.string().min(6).max(60).required().email({
        tlds:{allow:['com', 'net']}
    }),
    providedCode: joi.number()
});

exports.changePasswordSchema = joi.object({
    newPassword: joi.string().required().pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{8,}$/),
    oldPassword: joi.string().required().pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{8,}$/),
});

exports.acceptFPCodeSchema = joi.object({
    email: joi.string().min(6).max(60).required().email({
        tlds: {allow: ['com', 'net']},
    }),
    providedCode: joi.string().length(6).required(),
    newPassword: joi.string().required().pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{8,}$/),
});

exports.createPostSchema = joi.object({
    title: joi.string().min(6).max(60).required(),
    description: joi.string().min(6).max(600).required(),
    userId: joi.string().required()
    
});

