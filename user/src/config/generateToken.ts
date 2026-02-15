import jwt from 'jsonwebtoken';


export const generateToken = (user : any) => {
    return jwt.sign({user} , String(process.env.JWT_SECRET) , {expiresIn : '15d', algorithm : 'HS256'})
}
