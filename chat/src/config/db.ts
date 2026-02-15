import mongoose, { mongo } from "mongoose";

const connectDb = async () => {
    const url = process.env.MONGO_URI;

    if(!url){
        throw new Error("MONGO URI is not defined in enviroment variables")
    }

    try {

        await mongoose.connect(url , {
            dbName : "Chatappmicroservice"
        })

        console.log("connected to mongodb")
        
    } catch (error) {

        if(error instanceof Error){

            console.error(`error connected to Mongodb : ${error.message}`)
            process.exit(1);

        }
    }
}

export default connectDb;