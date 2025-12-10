import mongoose, { Schema, Model, Document } from 'mongoose';

export interface IMessage extends Document {
    senderId: string;
    receiverId: string;
    text: string;
    createdAt: Date;
    status: 'sent' | 'delivered' | 'read';
}

const MessageSchema = new Schema<IMessage>({
    senderId: {
        type: String,
        required: true,
        index: true
    },
    receiverId: {
        type: String,
        required: true,
        index: true
    },
    text: {
        type: String,
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now,
        index: true
        // No "expires" property here - TTL is managed by backend logic
    },
    status: {
        type: String,
        enum: ['sent', 'delivered', 'read'],
        default: 'sent'
    }
});

// Helper to prevent overwriting models during hot reload
// In development, we must delete the model to force a refresh if the schema changed
if (process.env.NODE_ENV === 'development' && mongoose.models.Message) {
    delete mongoose.models.Message;
}

const Message: Model<IMessage> = mongoose.models.Message || mongoose.model<IMessage>('Message', MessageSchema);

export default Message;
