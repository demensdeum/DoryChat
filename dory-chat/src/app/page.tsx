import ChatView from "@/components/ChatView";
import { cookies, headers } from "next/headers";
import connectToDatabase from "@/lib/db";
import User from "@/models/User";

export default async function Home() {
  const cookieStore = await cookies();
  const headerStore = await headers();
  const sessionId = cookieStore.get("dory_session")?.value || headerStore.get("x-dory-session") || undefined;

  let user = null;
  let contacts: any[] = [];

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

      // Fetch my contacts
      const populatedUser = await User.findOne({ sessionId })
        .populate('contacts')
        .populate('rooms')
        .exec();

      if (populatedUser) {
        contacts = [];

        if (populatedUser.contacts) {
          contacts.push(...populatedUser.contacts.map((u: any) => ({
            id: u._id.toString(),
            name: u.name,
            avatar: u.avatar,
            status: "offline",
            lastMessage: "Start a conversation",
            time: "",
            unread: 0,
            type: 'user'
          })));
        }

        if (populatedUser.rooms) {
          contacts.push(...populatedUser.rooms.map((r: any) => ({
            id: r._id.toString(),
            name: r.name || `${r.code}`,
            avatar: `https://api.dicebear.com/7.x/identicon/svg?seed=${r.code}`,
            status: "online",
            lastMessage: `Code: ${r.code}`,
            time: "",
            unread: 0,
            type: 'room',
            code: r.code
          })));
        }
      } else {
        contacts = [];
      }

    } catch (error) {
      console.error("Database Error:", error);
      // Fallback for DB errors
      user = { name: "Guest (Offline)", avatar: "", id: "offline" };
      contacts = [];
    }
  }

  return <ChatView user={user} sessionId={sessionId} initialContacts={contacts} />;
}
