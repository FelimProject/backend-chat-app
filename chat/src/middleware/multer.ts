import cloudinary from '../config/cloudinary';
import fs from 'fs';
import multer from 'multer'
import { NextFunction, Request , Response} from 'express';

export const upload = multer({ 
    dest: 'temp/',
    limits : {
        fileSize: 5 * 1024 * 1024
    },
    fileFilter: (req , file , cb) => {
        if(file.mimetype.startsWith("image/")){
            cb(null,true)
        }else{
            cb(new Error("Only image is provided"));
        }
    }
});

export const uploadImageMiddleware = async (
    req : Request,
    res : Response, 
    next : NextFunction
) => {
    if(req.file){
      try {
            const result = await cloudinary.uploader.upload(req.file.path, {
                folder: 'uploads',
                width: 500,
                height: 500,
                crop: 'limit',
            });

            fs.unlinkSync(req.file.path);

            req.body.cloudinaryResult = {
                url: result.secure_url,
                publicId: result.public_id
            };
            
            next();
        } catch (error) {
            console.error('Upload error:', error);
            if (req.file && fs.existsSync(req.file.path)) {
                fs.unlinkSync(req.file.path);
            }
            res.status(500).json({ error: 'Failed to upload image' });
            return;
        }
    } else {
        next();
    }
};