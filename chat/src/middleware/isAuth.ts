import { NextFunction, Request, Response } from "express";
import jwt, { JwtPayload } from 'jsonwebtoken';

interface IUser extends Document{
    _id : string;
    name : string;
    email : string;
}

export interface AuthenticatedRequest extends Request {
    user?: IUser | null
}

export const isAuth = async(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    
    try {
        const authHeader = req.headers.authorization;
        

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            res.status(401).json({
                message: "Please Login - Unauthenticated"
            });
            return;
        }

        const token = authHeader.split(" ")[1];

        if (!token) {
            res.status(401).json({
                message: "Token not provided"
            });
            return;
        }

        if (!process.env.JWT_SECRET) {
            res.status(500).json({
                message: "Server configuration error"
            });
            return;
        }

        const decodedValue = jwt.verify(token , process.env.JWT_SECRET , { algorithms: ['HS256']}) as JwtPayload;

        if (!decodedValue) {
            console.log("❌ No decoded value");
            res.status(401).json({
                message: "Invalid token - no payload"
            });
            return;
        }

        req.user = decodedValue.user;
    
        next();

    } catch (e) {
        
        if (e instanceof jwt.JsonWebTokenError) {
            res.status(401).json({
                message: "Invalid token format"
            });
        } else if (e instanceof jwt.TokenExpiredError) {
            res.status(401).json({
                message: "Token expired"
            });
        } else if (e instanceof jwt.NotBeforeError) {
            res.status(401).json({
                message: "Token not active yet"
            });
        } else {
            res.status(401).json({
                message: "Authentication failed: " + (e instanceof Error ? e.message : 'Unknown error')
            });
        }
        return;
    }
}