import amql , { Channel } from 'amqplib'

let channel : Channel

export const connectRabbitMQ = async () => {
    try {
        const connection = await amql.connect({
            protocol: "amqp",
            hostname : process.env.RABBIT_MQ_HOST,
            port : parseInt(String(process.env.RABBIT_MQ_PORT)),
            username: process.env.RABBIT_MQ_USERNAME,
            password: process.env.RABBIT_MQ_PASSWORD
        });

        channel = await connection.createChannel();

        console.log("Connected with rabbitmq")
    } catch (error) {
        if(error instanceof Error){
            console.error(error.message)
        }
    }
}

export const publishToQueue = async (queueName : string, message : Object) => {
    if(!channel){
        console.log("Rabbitmq channel isn't initialized");
        return;
    }

    await channel.assertQueue(queueName);

    channel.sendToQueue(queueName , Buffer.from(JSON.stringify(message)), {
        persistent: true
    })
}