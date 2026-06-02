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
    socket: {
        tls: true,
        reconnectStrategy: (retries) => {
          console.log(`Redis reconnect attempt ${retries}`);
    
          if (retries > 20) {
            return new Error('Too many retries.');
          }
    
          return Math.min(retries * 200, 5000);
        }
      }
});

redisClient.connect().then(() => console.log("connected to redis")).catch(console.error)

const app : Express = express();


app.use(express.json())

app.use("/api/v1", userRoutes);

const port = process.env.PORT;

app.listen(port, () => {
    console.log(`server is running on port ${port}`)
});
