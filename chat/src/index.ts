import express , { Express } from 'express';
import dotenv from 'dotenv';
import connectDb from './config/db';
import chatRoutes from './routes/chat';
import cors from 'cors'
import { app , server } from './config/socket';

dotenv.config();

connectDb();

app.use(cors({
    origin : process.env.FRONT_END_URL,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}))


app.use(express.json())

app.use("/api/v1", chatRoutes);


const port = process.env.PORT;

server.listen(port, () => {
    console.log(`server is running on port ${port}`)
});