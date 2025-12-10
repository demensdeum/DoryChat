import ChatView from "@/components/ChatView";
import { cookies, headers } from "next/headers";
import connectToDatabase from "@/lib/db";
import User from "@/models/User";

export default async function Home() {
  const cookieStore = await cookies();
  const headerStore = await headers();
  const sessionId = cookieStore.get("dory_session")?.value || headerStore.get("x-dory-session") || undefined;

  let user = null;

  if (sessionId) {
    try {
      await connectToDatabase();

      const existingUser = await User.findOne({ sessionId });

      if (existingUser) {
        user = {
          name: existingUser.name,
          avatar: existingUser.avatar,
          id: existingUser._id.toString()
        };
      } else {
        // Create new guest user
        const newUser = await User.create({
          sessionId,
          name: `Guest ${Math.floor(Math.random() * 10000)}`,
          avatar: `https://api.dicebear.com/7.x/notionists/svg?seed=${sessionId}`
        });

        user = {
          name: newUser.name,
          avatar: newUser.avatar,
          id: newUser._id.toString()
        };
      }
    } catch (error) {
      console.error("Database Error:", error);
      // Fallback for DB errors
      user = { name: "Guest (Offline)", avatar: "", id: "offline" };
    }
  }

  return <ChatView user={user} sessionId={sessionId} />;
}
