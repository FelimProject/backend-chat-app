import { Kafka, Producer, Admin } from 'kafkajs';

let producer: Producer;
let admin: Admin;

const kafka = new Kafka({
    clientId: process.env.KAFKA_CLIENT_ID || 'my-app',
    brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
});

export const connectKafka = async () => {
    try {
        admin = kafka.admin();
        await admin.connect();

        producer = kafka.producer({
            allowAutoTopicCreation: true,   
        });
        await producer.connect();

        console.log('Connected with Kafka');
    } catch (error) {
        if (error instanceof Error) {
            console.error(error.message);
        }
    }
};

export const publishToTopic = async (topicName: string, message: Object) => {
    if (!producer) {
        console.log("Kafka producer isn't initialized");
        return;
    }

    await producer.send({
        topic: topicName,
        messages: [
            {
                value: JSON.stringify(message),
            },
        ],
    });
};

export const disconnectKafka = async () => {
    await producer?.disconnect();
    await admin?.disconnect();
};