import mongoose, { Schema, Model, Document } from 'mongoose';

export interface IMessage extends Document {
    senderId: string;
    receiverId: string;
    text: string;
    createdAt: Date;
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
});

// Helper to prevent overwriting models during hot reload
const Message: Model<IMessage> = mongoose.models.Message || mongoose.model<IMessage>('Message', MessageSchema);

export default Message;
