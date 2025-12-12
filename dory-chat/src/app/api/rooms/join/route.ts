import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/db";
import { Room, User } from "@/models";
import { ROOM_TTL_MS } from "@/lib/config";

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { userId, code, publicKey } = body;

        if (!userId || !code || !publicKey) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        await connectToDatabase();

        // Cleanup old rooms (Backend Managed TTL)
        // Skip cleanup if TTL is zero or less (rooms persist indefinitely)
        if (ROOM_TTL_MS > 0) {
            const expirationTime = new Date(Date.now() - ROOM_TTL_MS);
            await Room.deleteMany({ createdAt: { $lt: expirationTime } });
        }

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
