import mongoose, { Schema, Model, Document } from 'mongoose';

export interface IUser extends Document {
    sessionId: string;
    name: string;
    avatar: string;
    createdAt: Date;
}

const UserSchema = new Schema<IUser>({
    sessionId: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    name: {
        type: String,
        required: true
    },
    avatar: {
        type: String,
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
});

// Helper to prevent overwriting models during hot reload
const User: Model<IUser> = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);

export default User;
