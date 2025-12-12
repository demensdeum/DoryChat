import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/db";
import { Room, User } from "@/models";
import { ROOM_TTL_MS } from "@/lib/config";

function generateCode(length: number) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
    return result;
}

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const roomId = searchParams.get('roomId');

        if (!roomId) {
            return NextResponse.json({ error: "Missing roomId" }, { status: 400 });
        }

        await connectToDatabase();

        // Cleanup old rooms (Backend Managed TTL)
        // Skip cleanup if TTL is zero or less (rooms persist indefinitely)
        if (ROOM_TTL_MS > 0) {
            const expirationTime = new Date(Date.now() - ROOM_TTL_MS);
            await Room.deleteMany({ createdAt: { $lt: expirationTime } });
        }

        const room = await Room.findById(roomId).populate('participants.user', 'name avatar');

        if (!room) {
            return NextResponse.json({ error: "Room not found" }, { status: 404 });
        }

        return NextResponse.json(room);
    } catch (error) {
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { userId, publicKey } = body;

        if (!userId || !publicKey) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        await connectToDatabase();

        // Cleanup old rooms (Backend Managed TTL)
        // Skip cleanup if TTL is zero or less (rooms persist indefinitely)
        if (ROOM_TTL_MS > 0) {
            const expirationTime = new Date(Date.now() - ROOM_TTL_MS);
            await Room.deleteMany({ createdAt: { $lt: expirationTime } });
        }

        // Generate unique code
        let code = generateCode(6);
        let existing = await Room.findOne({ code });
        while (existing) {
            code = generateCode(6);
            existing = await Room.findOne({ code });
        }

        const newRoom = await Room.create({
            code,
            participants: [{ user: userId, publicKey }],
            name: code
        });

        // Add to user's room list
        await User.findByIdAndUpdate(userId, {
            $addToSet: { rooms: newRoom._id }
        });

        return NextResponse.json(newRoom);
    } catch (error) {
        console.error("Create Room Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
