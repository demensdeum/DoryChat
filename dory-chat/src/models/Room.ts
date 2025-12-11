import mongoose, { Schema, Model, Document } from 'mongoose';

export interface IRoom extends Document {
    code: string;
    participants: { user: mongoose.Types.ObjectId; publicKey: string }[];
    createdAt: Date;
    name?: string; // Optional name, maybe "Room 123456" default
}

const RoomSchema = new Schema<IRoom>({
    code: {
        type: String,
        required: true,
        unique: true,
        index: true,
        length: 6
    },
    participants: [{
        user: { type: Schema.Types.ObjectId, ref: 'User' },
        publicKey: { type: String, required: true }
    }],
    name: {
        type: String
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});


const Room: Model<IRoom> = mongoose.models.Room || mongoose.model<IRoom>('Room', RoomSchema);

export default Room;
