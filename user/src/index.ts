import express , { Express } from 'express';
import dotenv from 'dotenv';
import connectDb from './config/db';
import { createClient } from 'redis';
import userRoutes from './routes/user';
import { connectKafka } from './config/kafka';

dotenv.config();

connectDb();

connectKafka();

export const redisClient = createClient({
    url: process.env.REDIS_URL,
});

redisClient.connect().then(() => console.log("connected to redis")).catch(console.error)

const app : Express = express();


app.use(express.json())

app.use("/api/v1", userRoutes);

const port = process.env.PORT;

app.listen(port, () => {
    console.log(`server is running on port ${port}`)
});