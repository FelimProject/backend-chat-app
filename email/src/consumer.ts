import amqp from 'amqplib';
import nodemailer from 'nodemailer';

export const startSendOtpConsumer = async () => {
    try {
        const connection = await amqp.connect({
            protocol: "amqp",
            hostname: process.env.RABBIT_MQ_HOST,
            port: parseInt(String(process.env.RABBIT_MQ_PORT)),
            username: process.env.RABBIT_MQ_USERNAME,
            password: process.env.RABBIT_MQ_PASSWORD
        });

        const channel = await connection.createChannel();
        const queueName = "send-otp";

        await channel.assertQueue(queueName, { durable: true });

        const transporter = nodemailer.createTransport({
            host: "smtp.gmail.com",
            port: 465,
            secure: true,
            auth: {
                user: process.env.MAIL_USER,
                pass: process.env.MAIL_PASSWORD
            }
        });

        channel.consume(queueName, async (msg) => {
            if (msg) {
                try {
                    const message = JSON.parse(msg.content.toString());

                    const { to, subject, body } = message;

                    const result = await transporter.sendMail({
                        from: process.env.MAIL_USER,
                        to,
                        subject,
                        text: body
                    });

                    console.log(`OTP sent successfully to ${to}. Message ID: ${result.messageId}`);
                    channel.ack(msg);
                    
                } catch (error) {
                    console.error(`Failed to send OTP:`, error instanceof Error ? error.message : error);
                    channel.ack(msg); 
                }
            }
        });

    } catch (error) {
        console.error(`Failed to start rabbitmq consumer:`, error);
    }
}