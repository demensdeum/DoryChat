import mongoose, { Schema, Model, Document } from 'mongoose';

export interface IUser extends Document {
    sessionId: string;
    name: string;
    avatar: string;
    createdAt: Date;
    contacts: mongoose.Types.ObjectId[];
    rooms: mongoose.Types.ObjectId[];
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
    contacts: [{
        type: Schema.Types.ObjectId,
        ref: 'User'
    }],
    rooms: [{
        type: Schema.Types.ObjectId,
        ref: 'Room'
    }],
    createdAt: {
        type: Date,
        default: Date.now
    },
});


const User: Model<IUser> = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);

export default User;
