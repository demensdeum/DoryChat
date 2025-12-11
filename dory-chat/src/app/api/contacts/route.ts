import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/db";
import { User } from "@/models";

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { userId, contactId } = body;

        if (!userId || !contactId) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        if (userId === contactId) {
            return NextResponse.json({ error: "Cannot add yourself" }, { status: 400 });
        }

        await connectToDatabase();

        // Add contactId to userId's contacts array if not already present
        // $addToSet ensures no duplicates
        await User.findByIdAndUpdate(userId, {
            $addToSet: { contacts: contactId }
        });

        // Also add userId to contactId's contacts array (Mutual friendship? Or just one-way?)
        // Most messengers are contact request based. 
        // For this MVP, let's treat it as a personal address book (One-way is fine, but maybe auto-add back for better UX?)
        // The user said "added to user", implies personal list.
        // Let's stick to adding to the requester's list only for now.

        const contactUser = await User.findById(contactId).select("_id name avatar");

        return NextResponse.json(contactUser);
    } catch (error) {
        console.error("Add Contact Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
