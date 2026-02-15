import { Request, Response } from "express";
import { redisClient } from "..";
import { publishToQueue } from "../config/rabbitmq";
import TryCatch from "../config/TryCatch";
import { User } from "../model/User";
import { generateToken } from "../config/generateToken";
import { AuthenticatedRequest } from "../middleware/isAuth";

export const loginUser = TryCatch(async(req : Request , res : Response) => {
    const {email} = req.body;

    const rateLimitKey = `otp:ratelimit:${email}`;
    const rateLimit = await redisClient.get(rateLimitKey);

    if(rateLimit){
        res.status(429).json({
            message: 'Too many requests. Please wait before requesting new otp'
        })

        return;
    }

    const otp = Math.floor(100000 +  Math.random() * 9).toString();

    const otpKey = `otp:${email}`

    await redisClient.set(otpKey , otp , {
        EX: 300
    });

    await redisClient.set(rateLimitKey , 'true', {
        EX: 60
    })

    const message = {
        to : email,
        subject : "Your otp code",
        body :  `Your OTP is ${otp}. IT is valid for 5 minutes`
    }

    await publishToQueue("send-otp", message);

    res.status(200).json({message : `sucessfully send OTP to ${email}`});

});

export const verifyUser = TryCatch(async(req : Request , res : Response) => {
    const {email , otp:enteredOtp} = req.body;

    if(!email || !enteredOtp){
        res.status(400).json({
            message : "Email and OTP Required"
        });

        return;
    }

    const otpKey = `otp:${email}`;

    const storedOtp = await redisClient.get(otpKey);

    if(!storedOtp || storedOtp !== enteredOtp){
        res.status(400).json({
            message : "Invalid or expired OTP"
        });

        return;
    }

    await redisClient.del(otpKey);

    let user  = await User.findOne({email});

    if(!user){
        const name = email.slice(0, 8);

        user = await User.create({name , email});
    }

    const token = generateToken(user);

    res.status(200).json({
        message : `sucessfully verified ${email}`,
        user,
        token
    })

 })

 export const myProfile = TryCatch(async(req: AuthenticatedRequest , res : Response) => {
    const user = req.user;

    res.json(user);
 })

 export const updateName = TryCatch(async(req: AuthenticatedRequest , res : Response) => {
    const user = await User.findById(req.user?._id);

    if(!user){
        res.status(404).json({
            message : "Please login"
        });

        return;
    }

    user.name = req.body.name;

    await user.save();

    const token = generateToken(user);

     res.json({
        message: "User updated",
        user,
        token
    })
 })


 export const getAllUsers = TryCatch(async(req: AuthenticatedRequest, res : Response) => {
    const users = await User.find();

    res.status(200).json(users);
 })

 export const getAUser = TryCatch(async(req: AuthenticatedRequest, res : Response) => {
    const user = await User.findById(req.params.id);
    
    res.status(200).json(user);
 })