import ChatView from "@/components/ChatView";
import { cookies } from "next/headers";

export default async function Home() {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get("dory_session")?.value;

  return <ChatView sessionId={sessionId} />;
}
