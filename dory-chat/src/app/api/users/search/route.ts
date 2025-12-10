import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/db";
import User from "@/models/User";

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const query = searchParams.get("q");
        const currentUserId = searchParams.get("userId");

        if (!query) {
            return NextResponse.json([]);
        }

        await connectToDatabase();

        // Find users by name, excluding current user and mock users (if any left)
        // Limit to 10 results
        const users = await User.find({
            name: { $regex: query, $options: "i" },
            _id: { $ne: currentUserId }
        })
            .select("_id name avatar")
            .limit(10);

        return NextResponse.json(users);
    } catch (error) {
        console.error("Search Logic Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
