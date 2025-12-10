import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/db";
import Message from "@/models/Message";

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get("userId");
        const contactId = searchParams.get("contactId");

        const type = searchParams.get("type");

        if (!userId || !contactId) {
            return NextResponse.json({ error: "Missing required params" }, { status: 400 });
        }

        await connectToDatabase();

        // Cleanup old messages (Backend Managed TTL)
        const oneMinuteAgo = new Date(Date.now() - 60 * 1000);
        await Message.deleteMany({ createdAt: { $lt: oneMinuteAgo } });

        if (type === 'room') {
            const messages = await Message.find({
                receiverId: contactId
            }).sort({ createdAt: 1 });
            return NextResponse.json(messages);
        }

        // Mark messages as delivered if I am the receiver
        // Example: I am User A. Contact is User B.
        // I want to see marks from User B as delivered.
        // receiverId = UserA, senderId = UserB
        const updateQuery = { receiverId: userId, senderId: contactId, status: 'sent' };
        console.log(`[GET Debug] Attempting update with query:`, JSON.stringify(updateQuery));

        const updateResult = await Message.updateMany(
            updateQuery,
            { $set: { status: 'delivered' } }
        );

        console.log(`[GET] User ${userId} fetched chat with ${contactId}. Matched: ${updateResult.matchedCount}, Modified: ${updateResult.modifiedCount}`);

        const messages = await Message.find({
            $or: [
                { senderId: userId, receiverId: contactId },
                { senderId: contactId, receiverId: userId },
            ],
        }).sort({ createdAt: 1 });

        console.log(`[GET] Found ${messages.length} messages. Sample status: ${messages[messages.length - 1]?.status}`);

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

        // Cleanup old messages (Backend Managed TTL)
        const oneMinuteAgo = new Date(Date.now() - 60 * 1000);
        await Message.deleteMany({ createdAt: { $lt: oneMinuteAgo } });

        const newMessage = await Message.create({
            senderId,
            receiverId,
            text,
            status: 'sent'
        });

        console.log(`[POST] User ${senderId} sent message to ${receiverId}: "${text.substring(0, 20)}..."`);

        return NextResponse.json(newMessage);
    } catch (error) {
        console.error("Failed to send message:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
