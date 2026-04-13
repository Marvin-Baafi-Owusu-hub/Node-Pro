const jwt = require('jsonwebtoken');
const { signupSchema, signinSchema, acceptCodeSchema, changePasswordSchema, acceptFPCodeSchema } = require("../middlewares/validator");
const User = require('../models/usersModel');
const {doHash, doHashValidation, hmacProcess} = require('../utils/hashing');
const transport = require('../middlewares/sendMail');


exports.signup = async(req, res) => {
    const {email, password} = req.body || {}; 
    try {
        const {error, value} = signupSchema.validate({email, password});
        if(error){
            return res.status(401).json({success: false, message: error.details[0].message})
        }
        const existingUser = await User.findOne({email});

        if(existingUser){
            return res.status(401).json({success: false, message:"User already exists!"})
        }
        const hashedPassword = await doHash(password, 12);
        const newUser = new User({
            email,
            password: hashedPassword,
        }) 
        const result = await newUser.save();
        result.password = undefined;
        return res.status(201).json({
            success: true, message: "Your Account has been created successfully",
            result,
        })

    } catch(error) {
        return res.status(500).json({success: false, message: error.message});
    }
} 

exports.signin = async(req, res) => {
    const {email, password} = req.body;
    try {
        const {error, value} = signinSchema.validate({email, password});

        if(error) {
            return res.status(401).json({success: false, message: error.details[0].message})
        }

        const existingUser = await User.findOne({email}).select('+password')
        if(!existingUser) {
            return res.status(401).json({success: false, message:"User does not exist!"})
        }

        const result = await doHashValidation(password, existingUser.password)
            if(!result) {
            return res.status(401).json({success: false, message:"Invalid credentials!"})
            }
        
            const token = jwt.sign({
                userId: existingUser._id,
                email: existingUser.email,
                verified: existingUser.verified,
            }, process.env.TOKEN_SECRET, {
                expiresIn:'8h',
            });

           return res.cookie('authentication', 'Bearer ' + token, {expires: new Date (Date.now() + 8 * 3600000), 
                httpOnly: process.env.NODE_ENV === 'production', secure: process.env.NODE_ENV === 'production'})
                .json({
                    success: true,
                    token,
                    message: 'Logged in successfully!',
                })
    } catch (error) {
        return res.status(500).json({success: false, message: error.message});
    }
};

exports.signout = async (req, res) => {
    return res.clearCookie('authorization').status(200).json({success:true, message: 'Logged out successfully!'})
}; 

exports.sendVerificationCode = async (req, res) => {
    const {email} = req.body;
    try {
        const existingUser = await User.findOne({email})
        if(!existingUser) {
            return res.status(404).json({success:false, message: 'User does not exist!'});
        }
        if (existingUser.verified){
            return res.status(400).json({success:false, message: 'You are already verified!'});
        }

        const codeValue = Math.floor(Math.random() * 1000000).toString();
        let info = await transport.sendMail({
            from: process.env.NODE_CODE_SENDING_EMAIL_ADDRESS,
            to: existingUser.email,
            subject: "Verification Code",
            html: '<h>' + codeValue + '</h>'
        })
        if(info.accepted[0] === existingUser.email) {
            const hashedCodeValue = hmacProcess(codeValue, process.env.HMAC_VERIFICATION_CODE_SECRET)
            existingUser.verificationCode = hashedCodeValue;
            existingUser.verificationCodeValidation = Date.now();
            await existingUser.save();
            return res.status(200).json({success: true, message: 'Code sent!'})
        }
    return res.status(400).json({success: true, message: 'Code sent failed!'});
    } catch(error) {
    return res.status(500).json({success: false, message: error.message});
    }
};

exports.verifyVerificationCode = async(req, res) => {
    const {email, providedCode} = req.body;
    try {
        const {error, value} = acceptCodeSchema.validate({email, providedCode});
        if(error) {
            return res.status(401).json({success: false, message: error.details[0].message})
        } 

        const codeValue = providedCode.toString();
        const existingUser = await User.findOne({email}).select("+verificationCode +verificationCodeValidation");

        if(!existingUser) {
            return res.status(401).json({success: false, message: 'User does not exist'});
        }
        if(existingUser.verified){
            return res.status(400).json({success: false, message:"You are already verified!"});
        }
        if(!existingUser.verificationCode || !existingUser.verificationCodeValidation) {
            return res.status(400).json({success: false, message: "Something is wrong with the code!"})
        }
        if(Date.now() - existingUser.verificationCodeValidation > 5 * 60 * 1000){
            return res.status(400).json({success: false, message: 'Code has been expired!'});
        }

        const hashedCodeValue = hmacProcess(codeValue, process.env.HMAC_VERIFICATION_CODE_SECRET)
        if(hashedCodeValue === existingUser.verificationCode){
            existingUser.verified = true;
            existingUser.verificationCode = undefined;
            existingUser.verificationCodeValidation = undefined;
            await existingUser.save()
            return res.status(200).json({success: true, message: 'Your Account has been verified!'});
        }
        return res.status(400).json({success: false, message: 'Unexpected occurred!!'});

    } catch(error) {
        return res.status(500).json({success: false, message: error.message});
    }
};

exports.changePassword = async (req, res) => {
    const {userId, verified} = req.user;
    const {oldPassword, newPassword} = req.body;
    try {
        const {error, value} = changePasswordSchema.validate({oldPassword, newPassword});
        if(error){
            return res.status(401).json({success: false, message: error.message});
        }
        if(!verified){
            return res.status(401).json({success: false, message: 'You are not a verified user!'});
        }
        const existingUser = await User.findOne({_id:userId}).select('+password');
        if(!existingUser){
            return res.status(401).json({success: false, message: 'User does not exist!'});
        }
        const result = await doHashValidation(oldPassword, existingUser.password);
        if(!result){
            return res.status(401).json({success: false, message: 'Invalid Credentials'});
        }
        const hashedPassword = await doHash(newPassword, 12);
        existingUser.password = hashedPassword;
        await existingUser.save();
        return res.status(200).json({success: true, message: 'Password Updated!'});

    } catch {
        return res.status(500).json({success: false, message: error.message});
    }
}
exports.sendForgotPasswordCode = async (req, res) => {
    const { email } = req.body;

    try {
        const existingUser = await User.findOne({ email });

        if (!existingUser) {
            return res.status(404).json({
                success: false,
                message: 'User does not exist!'
            });
        }

        //Always generate 6-digit code
        const codeValue = Math.floor(100000 + Math.random() * 900000).toString();

        console.log("PLAIN RESET CODE:", codeValue); //VERY IMPORTANT

        //Hash the code
        const hashedCodeValue = hmacProcess(
            codeValue,
            process.env.HMAC_VERIFICATION_CODE_SECRET
        );

        //SAVE FIRST (CRITICAL FIX)
        existingUser.forgotPasswordCode = hashedCodeValue;
        existingUser.forgotPasswordCodeValidation = Date.now();

        await existingUser.save();

        //THEN send email (optional success)
        await transport.sendMail({
            from: process.env.NODE_CODE_SENDING_EMAIL_ADDRESS,
            to: existingUser.email,
            subject: "Forgot Password Code",
            html: `<h1>${codeValue}</h1>`
        });

        return res.status(200).json({
            success: true,
            message: 'Code sent!'
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message  
        });
    }
};
exports.verifyForgotPasswordCode = async (req, res) => {
    const { email, providedCode, newPassword } = req.body;

    try {
        const { error } = acceptFPCodeSchema.validate({
            email,
            providedCode,
            newPassword
        });

        if (error) {
            return res.status(401).json({
                success: false,
                message: error.details[0].message
            });
        }

        const existingUser = await User.findOne({ email });

        console.log("USER:", existingUser);

        if (!existingUser) {
            return res.status(401).json({
                success: false,
                message: 'User does not exist'
            });
        }

        console.log("Code in DB:", existingUser.forgotPasswordCode);
        console.log("Time in DB:", existingUser.forgotPasswordCodeValidation);

        if (!existingUser.forgotPasswordCode || !existingUser.forgotPasswordCodeValidation) {
            return res.status(400).json({
                success: false,
                message: 'No reset code found. Please request a new one.'
            });
        }

        if (Date.now() - existingUser.forgotPasswordCodeValidation > 5 * 60 * 1000) {
            return res.status(400).json({
                success: false,
                message: 'Code has expired!'
            });
        }

        const hashedCodeValue = hmacProcess(
            providedCode.toString(),
            process.env.HMAC_VERIFICATION_CODE_SECRET
        );

        if (hashedCodeValue === String(existingUser.forgotPasswordCode)) {
            const hashedPassword = await doHash(newPassword, 12);

            existingUser.password = hashedPassword;
            existingUser.forgotPasswordCode = undefined;
            existingUser.forgotPasswordCodeValidation = undefined;

            await existingUser.save();

            return res.status(200).json({
                success: true,
                message: 'Password reset successful!'
            });
        }

        return res.status(400).json({
            success: false,
            message: 'Invalid code!'
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};