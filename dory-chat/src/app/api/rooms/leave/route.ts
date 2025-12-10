import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/db";
import Room from "@/models/Room";
import User from "@/models/User";

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { userId, roomId } = body;

        if (!userId || !roomId) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        await connectToDatabase();

        // Remove user from room participants
        await Room.findByIdAndUpdate(roomId, {
            $pull: { participants: userId }
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
