import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/db";
import Message from "@/models/Message";

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get("userId");
        const contactId = searchParams.get("contactId");

        if (!userId || !contactId) {
            return NextResponse.json({ error: "Missing required params" }, { status: 400 });
        }

        await connectToDatabase();

        const messages = await Message.find({
            $or: [
                { senderId: userId, receiverId: contactId },
                { senderId: contactId, receiverId: userId },
            ],
        }).sort({ createdAt: 1 });

        return NextResponse.json(messages);
    } catch (error) {
        console.error("Failed to fetch messages:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { senderId, receiverId, text } = body;

        if (!senderId || !receiverId || !text) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        await connectToDatabase();

        const newMessage = await Message.create({
            senderId,
            receiverId,
            text,
        });

        return NextResponse.json(newMessage);
    } catch (error) {
        console.error("Failed to send message:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
