import { Kafka, Consumer } from 'kafkajs';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const kafka = new Kafka({
    clientId: 'mail-service',
    brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
});


const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASSWORD
    }
});


export const startSendOtpConsumer = async () => {
    const consumer: Consumer = kafka.consumer({ 
        groupId: 'mail-service-group' 
    });

    try {
        await consumer.connect();
        await consumer.subscribe({ 
            topic: 'send-otp', 
            fromBeginning: false  
        });

        await consumer.run({
            eachMessage: async ({ message }) => {
                if (!message.value) return;

                try {
                    const { to, subject, body } = JSON.parse(message.value.toString());

                    const result = await transporter.sendMail({
                        from: process.env.MAIL_USER,
                        to,
                        subject,
                        text: body
                    });

                    console.log(`OTP sent successfully to ${to}. Message ID: ${result.messageId}`);

                } catch (error) {
                    console.error(`Failed to send OTP:`, error instanceof Error ? error.message : error);
                }
            }
        });

        console.log('Kafka OTP consumer started');
    } catch (error) {
        console.error('Failed to start Kafka consumer:', error);
        await consumer.disconnect();
    }
};