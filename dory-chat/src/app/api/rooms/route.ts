import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/db";
import Room from "@/models/Room";
import User from "@/models/User";

function generateCode(length: number) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { userId } = body;

        if (!userId) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        await connectToDatabase();

        // Generate unique code
        let code = generateCode(6);
        let existing = await Room.findOne({ code });
        while (existing) {
            code = generateCode(6);
            existing = await Room.findOne({ code });
        }

        const newRoom = await Room.create({
            code,
            participants: [userId],
            name: `Room ${code}`
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
