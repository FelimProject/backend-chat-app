import express , { Express } from 'express';
import dotenv from 'dotenv';
import { startSendOtpConsumer } from './consumer';

dotenv.config();

startSendOtpConsumer();

const app : Express = express();

const port = process.env.PORT;

app.listen(port , () => {
    console.log(`Server is running on port ${port}`)
})