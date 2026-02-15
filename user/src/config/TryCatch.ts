import { NextFunction, RequestHandler , Request , Response } from "express";

const TryCatch = (handler : RequestHandler) : RequestHandler => {
    return async(req : Request , res : Response , next : NextFunction) => {
        try {
            await handler(req , res , next);
        } catch (error) {
            if(error instanceof Error){
                res.status(500).json({messages : `Internal server error : ${error.message}`});
            }
        }
    }
}

export default TryCatch;