import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/db";
import { Room, User } from "@/models";
import { ROOM_TTL_MS } from "@/lib/config";

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { userId, roomId } = body;

        if (!userId || !roomId) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        await connectToDatabase();

        // Cleanup old rooms (Backend Managed TTL)
        // Skip cleanup if TTL is zero or less (rooms persist indefinitely)
        if (ROOM_TTL_MS > 0) {
            const expirationTime = new Date(Date.now() - ROOM_TTL_MS);
            await Room.deleteMany({ createdAt: { $lt: expirationTime } });
        }

        // Remove user from room participants
        await Room.findByIdAndUpdate(roomId, {
            $pull: { participants: { user: userId } }
        });

        // Remove room from user's room list
        await User.findByIdAndUpdate(userId, {
            $pull: { rooms: roomId }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Leave Room Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
