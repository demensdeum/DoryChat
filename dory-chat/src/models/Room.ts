import mongoose, { Schema, Model, Document } from 'mongoose';

export interface IRoom extends Document {
    code: string;
    participants: mongoose.Types.ObjectId[];
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
        type: Schema.Types.ObjectId,
        ref: 'User'
    }],
    name: {
        type: String
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Helper to prevent overwriting models during hot reload
if (process.env.NODE_ENV === 'development' && mongoose.models.Room) {
    delete mongoose.models.Room;
}

const Room: Model<IRoom> = mongoose.models.Room || mongoose.model<IRoom>('Room', RoomSchema);

export default Room;
