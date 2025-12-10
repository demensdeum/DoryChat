"use client";

import {
    MessageSquare,
    Settings,
    Phone,
    Video,
    MoreVertical,
    Search,
    Plus,
    Send,
    Smile,
    Mic
} from "lucide-react";
import { useState, useEffect } from "react";

// Mock data
const DEFAULT_CONTACTS = [
    { id: 1, name: "Alice Freeman", avatar: "https://api.dicebear.com/7.x/notionists/svg?seed=Alice", status: "online", lastMessage: "Hey! How are you doing?", time: "10:42 AM", unread: 2 },
    { id: 2, name: "Bob Smith", avatar: "https://api.dicebear.com/7.x/notionists/svg?seed=Bob", status: "offline", lastMessage: "Can we reschedule?", time: "Yesterday", unread: 0 },
];

export default function ChatView({
    sessionId = "Guest",
    user,
    initialContacts = []
}: {
    sessionId?: string;
    user?: { name: string; avatar: string; id: string } | null;
    initialContacts?: any[];
}) {
    const [contacts, setContacts] = useState(initialContacts.length > 0 ? initialContacts : DEFAULT_CONTACTS);
    const [selectedContact, setSelectedContact] = useState(contacts[0]);
    const [messageInput, setMessageInput] = useState("");
    const [messages, setMessages] = useState<any[]>([]);

    const currentUser = user || {
        name: "Guest",
        avatar: `https://api.dicebear.com/7.x/notionists/svg?seed=${sessionId}`,
        id: "guest"
    };

    // Fetch messages when contact changes
    useEffect(() => {
        if (!selectedContact || !currentUser.id || currentUser.id === 'guest') return;

        const fetchMessages = async () => {
            try {
                const res = await fetch(`/api/messages?userId=${currentUser.id}&contactId=${selectedContact.id}`);
                if (res.ok) {
                    const data = await res.json();
                    setMessages(data.map((m: any) => ({
                        id: m._id,
                        text: m.text,
                        time: new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                        isMe: m.senderId === currentUser.id
                    })));
                }
            } catch (err) {
                console.error("Failed to load messages", err);
            }
        };

        fetchMessages();
        // Poll for new messages every 3 seconds
        const interval = setInterval(fetchMessages, 3000);
        return () => clearInterval(interval);
    }, [selectedContact, currentUser.id]);

    const handleSendMessage = async () => {
        if (!messageInput.trim() || !selectedContact) return;

        try {
            const payload = {
                senderId: currentUser.id,
                receiverId: selectedContact.id,
                text: messageInput
            };

            const res = await fetch('/api/messages', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                const savedMsg = await res.json();
                setMessages(prev => [...prev, {
                    id: savedMsg._id,
                    text: savedMsg.text,
                    time: new Date(savedMsg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    isMe: true
                }]);
                setMessageInput("");
            }
        } catch (err) {
            console.error("Failed to send", err);
        }
    };

    return (
        <div className="flex h-screen w-full bg-zinc-50 dark:bg-black text-zinc-900 dark:text-zinc-100 overflow-hidden font-sans">

            {/* Sidebar */}
            <aside className="w-80 border-r border-zinc-200 dark:border-zinc-800 flex flex-col bg-white dark:bg-zinc-950/50 backdrop-blur-xl">
                {/* Sidebar Header */}
                <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between sticky top-0 bg-transparent z-10">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                            <MessageSquare className="w-5 h-5 text-white" />
                        </div>
                        <h1 className="font-bold text-xl tracking-tight">Dory<span className="text-blue-600">Chat</span></h1>
                    </div>
                    <button className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors">
                        <Settings className="w-5 h-5 text-zinc-500" />
                    </button>
                </div>

                {/* Search */}
                <div className="p-4">
                    <div className="relative group">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-blue-500 transition-colors" />
                        <input
                            type="text"
                            placeholder="Search messages..."
                            className="w-full bg-zinc-100 dark:bg-zinc-900 border-none rounded-2xl py-2 pl-9 pr-4 text-sm focus:ring-2 focus:ring-blue-500/20 outline-none transition-all placeholder:text-zinc-500"
                        />
                    </div>
                </div>

                {/* Contacts List */}
                <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-200 dark:scrollbar-thumb-zinc-800">
                    <div className="px-2">
                        {contacts.map((contact) => (
                            <button
                                key={contact.id}
                                onClick={() => setSelectedContact(contact)}
                                className={`w-full p-3 rounded-xl flex items-center gap-4 transition-all duration-200 ${selectedContact?.id === contact.id
                                        ? "bg-blue-600 shadow-md shadow-blue-500/20"
                                        : "hover:bg-zinc-100 dark:hover:bg-zinc-900"
                                    }`}
                            >
                                <div className="relative">
                                    <img
                                        src={contact.avatar}
                                        alt={contact.name}
                                        className="w-12 h-12 rounded-full bg-zinc-200 dark:bg-zinc-800 object-cover"
                                    />
                                    {contact.status === "online" && (
                                        <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white dark:border-zinc-950 rounded-full" />
                                    )}
                                </div>

                                <div className="flex-1 text-left min-w-0">
                                    <div className="flex justify-between items-center mb-0.5">
                                        <span className={`font-semibold truncate ${selectedContact?.id === contact.id ? "text-white" : "text-zinc-900 dark:text-zinc-100"
                                            }`}>
                                            {contact.name}
                                        </span>
                                        <span className={`text-xs ${selectedContact?.id === contact.id ? "text-blue-100" : "text-zinc-400"
                                            }`}>
                                            {contact.time}
                                        </span>
                                    </div>
                                    <p className={`text-sm truncate ${selectedContact?.id === contact.id ? "text-blue-100" : "text-zinc-500 dark:text-zinc-400"
                                        }`}>
                                        {contact.lastMessage}
                                    </p>
                                </div>

                                {contact.unread > 0 && (
                                    <div className={`px-2 py-0.5 rounded-full text-xs font-bold ${selectedContact?.id === contact.id
                                            ? "bg-white text-blue-600"
                                            : "bg-blue-600 text-white"
                                        }`}>
                                        {contact.unread}
                                    </div>
                                )}
                            </button>
                        ))}
                    </div>
                </div>

                {/* User Profile Mini */}
                <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-purple-500 to-pink-500 shrink-0 overflow-hidden">
                        <img src={currentUser.avatar} alt="Me" className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate">{currentUser.name}</p>
                        <p className="text-[10px] text-zinc-400 truncate" title={sessionId}>ID: {sessionId.slice(0, 8)}...</p>
                    </div>
                    <button className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full">
                        <Mic className="w-4 h-4 text-zinc-500" />
                    </button>
                </div>
            </aside>

            {/* Main Chat Area */}
            <main className="flex-1 flex flex-col min-w-0 bg-white dark:bg-zinc-950 relative">

                {/* Chat Header */}
                <header className="h-16 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between px-6 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md sticky top-0 z-10">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center text-zinc-600 dark:text-zinc-300 font-bold overflow-hidden">
                            {selectedContact ? (
                                <img src={selectedContact.avatar} alt={selectedContact.name} className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full bg-zinc-300 animate-pulse" />
                            )}
                        </div>
                        <div>
                            <h2 className="font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                                {selectedContact ? selectedContact.name : "Select a contact"}
                                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                            </h2>
                            <p className="text-xs text-zinc-500">Active now</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-1">
                        <button className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-full text-zinc-500 transition-colors">
                            <Phone className="w-5 h-5" />
                        </button>
                        <button className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-full text-zinc-500 transition-colors">
                            <Video className="w-5 h-5" />
                        </button>
                        <div className="w-px h-6 bg-zinc-200 dark:bg-zinc-800 mx-2" />
                        <button className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-full text-zinc-500 transition-colors">
                            <Search className="w-5 h-5" />
                        </button>
                        <button className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-full text-zinc-500 transition-colors">
                            <MoreVertical className="w-5 h-5" />
                        </button>
                    </div>
                </header>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin scrollbar-thumb-zinc-200 dark:scrollbar-thumb-zinc-800 bg-slate-50 dark:bg-black/50">
                    {/* Date separator */}
                    <div className="flex justify-center">
                        <span className="text-xs font-medium text-zinc-400 bg-zinc-100 dark:bg-zinc-900 px-3 py-1 rounded-full">Today</span>
                    </div>

                    {messages.map((msg) => (
                        <div
                            key={msg.id}
                            className={`flex gap-3 max-w-3xl ${msg.isMe ? "ml-auto flex-row-reverse" : ""}`}
                        >
                            {!msg.isMe && selectedContact && (
                                <div className="w-8 h-8 rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center text-xs font-bold shrink-0 self-end overflow-hidden">
                                    <img src={selectedContact.avatar} alt="Avatar" className="w-full h-full object-cover" />
                                </div>
                            )}

                            <div className={`group relative px-5 py-3 rounded-2xl shadow-sm text-sm leading-relaxed max-w-[80%] ${msg.isMe
                                    ? "bg-blue-600 text-white rounded-br-none"
                                    : "bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 rounded-bl-none border border-zinc-100 dark:border-zinc-800"
                                }`}>
                                <p>{msg.text}</p>
                                <span className={`text-[10px] absolute bottom-1 ${msg.isMe ? "right-3 text-blue-100/70" : "left-3 text-zinc-400"
                                    } opacity-0 group-hover:opacity-100 transition-opacity`}>
                                    {msg.time}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Chat Input */}
                <div className="p-4 bg-white dark:bg-zinc-950/80 backdrop-blur-md border-t border-zinc-200 dark:border-zinc-800">
                    <div className="flex items-center gap-2 max-w-5xl mx-auto">
                        <button className="p-2.5 text-zinc-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-full transition-colors">
                            <Plus className="w-5 h-5" />
                        </button>

                        <div className="flex-1 relative">
                            <input
                                type="text"
                                value={messageInput}
                                onChange={(e) => setMessageInput(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                                placeholder="Type a message..."
                                className="w-full bg-zinc-100 dark:bg-zinc-900 border-none rounded-xl py-3 pl-4 pr-12 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                            />
                            <button className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300">
                                <Smile className="w-5 h-5" />
                            </button>
                        </div>

                        <button
                            onClick={handleSendMessage}
                            className={`p-3 rounded-xl transition-all ${messageInput.trim()
                                    ? "bg-blue-600 text-white shadow-lg shadow-blue-500/30 hover:bg-blue-700 hover:scale-105 active:scale-95"
                                    : "bg-zinc-100 dark:bg-zinc-800/50 text-zinc-400 cursor-not-allowed"
                                }`}>
                            <Send className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </main>

        </div>
    );
}
