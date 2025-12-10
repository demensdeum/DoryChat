import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/db";
import Room from "@/models/Room";
import User from "@/models/User";

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { userId, code, publicKey } = body;

        if (!userId || !code || !publicKey) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        await connectToDatabase();

        const room = await Room.findOne({ code });

        if (!room) {
            return NextResponse.json({ error: "Room not found" }, { status: 404 });
        }

        // Check if user is already a participant
        const isParticipant = room.participants.some((p: any) => p.user.toString() === userId);

        if (!isParticipant && room.participants.length >= 2) {
            return NextResponse.json({ error: "Room is full (Max 2 participants)" }, { status: 403 });
        }

        // Add user to room participants
        if (!isParticipant) {
            await Room.findByIdAndUpdate(room._id, {
                $push: { participants: { user: userId, publicKey } }
            });
        }

        // Add room to user's room list
        await User.findByIdAndUpdate(userId, {
            $addToSet: { rooms: room._id }
        });

        return NextResponse.json(room);
    } catch (error) {
        console.error("Join Room Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
