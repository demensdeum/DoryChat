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
    Mic,
    Check,
    CheckCheck,
    Trash2,
    Copy
} from "lucide-react";
import { useState, useEffect, useRef } from "react";

// Default contacts removed to prevent confusion
// Use empty array if no contacts provided
const DEFAULT_CONTACTS: any[] = [];

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

    // Search State
    const [searchQuery, setSearchQuery] = useState("");
    const [copied, setCopied] = useState(false);

    const messagesEndRef = useRef<HTMLDivElement>(null);

    const currentUser = user || {
        name: "Guest",
        avatar: `https://api.dicebear.com/7.x/notionists/svg?seed=${sessionId}`,
        id: "guest"
    };

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };



    // Fetch messages & Room Details when contact changes
    useEffect(() => {
        if (!selectedContact || !currentUser.id || currentUser.id === 'guest') return;

        const fetchMessages = async () => {
            try {
                // If it's a room, refresh its participants (to get new Public Keys)
                if (selectedContact.type === 'room') {
                    const roomRes = await fetch(`/api/rooms?roomId=${selectedContact.id}`);
                    if (roomRes.ok) {
                        const roomData = await roomRes.json();
                        // Update the Ref or State silently so we have fresh keys for sending
                        // We can just mutate current selectedContact for now or update contacts list?
                        // Mutating local object is risky but state update might trigger loop.
                        // Better: Update the contacts array and re-select?
                        // For MVP, just update the selectedContact object in contacts state
                        setContacts(prev => prev.map(c => {
                            if (c.id === selectedContact.id) {
                                return { ...c, participants: roomData.participants };
                            }
                            return c;
                        }));
                        // Also update the local selectedContact instance to be immediate
                        selectedContact.participants = roomData.participants;
                    }
                }

                const typeParam = selectedContact.type === 'room' ? '&type=room' : '';
                const res = await fetch(`/api/messages?userId=${currentUser.id}&contactId=${selectedContact.id}${typeParam}`);
                if (res.ok) {
                    const data = await res.json();

                    const decryptedMessages = await Promise.all(data.map(async (m: any) => {
                        let text = m.text;

                        if (selectedContact.type === 'room') {
                            try {
                                const bundle = JSON.parse(m.text);
                                if (bundle.keys && bundle.iv && bundle.c) {
                                    // E2EE Message
                                    // Get Private Key from IDB
                                    const myKey = await getPrivateKey(selectedContact.id);

                                    if (myKey) {
                                        const myEncryptedAesKey = bundle.keys[currentUser.id];
                                        if (myEncryptedAesKey) {
                                            // Decrypt AES Key
                                            const keyBytes = new Uint8Array(myEncryptedAesKey.split(',').map(Number));
                                            const rawAesKey = await window.crypto.subtle.decrypt(
                                                { name: "RSA-OAEP" },
                                                myKey,
                                                keyBytes
                                            );
                                            const aesKey = await window.crypto.subtle.importKey("raw", rawAesKey, { name: "AES-GCM" }, false, ["decrypt"]);

                                            // Decrypt Content
                                            const content = await window.crypto.subtle.decrypt(
                                                { name: "AES-GCM", iv: new Uint8Array(bundle.iv) },
                                                aesKey,
                                                new Uint8Array(bundle.c)
                                            );
                                            text = new TextDecoder().decode(content);
                                        } else {
                                            text = "🔒 Unreadable (No Key for You)";
                                        }
                                    } else {
                                        text = "🔒 Locked (Missing Private Key)";
                                    }
                                }
                            } catch (e) {
                                // Not a JSON bundle or decryption failed, might be old plaintext
                            }
                        }

                        return {
                            id: m._id,
                            text: text,
                            createdAt: new Date(m.createdAt),
                            time: new Date(m.createdAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
                            isMe: m.senderId === currentUser.id,
                            status: m.status
                        };
                    }));

                    setMessages(decryptedMessages);
                }
            } catch (err) {
                console.error("Failed to load messages", err);
            }
        };

        fetchMessages();
        const interval = setInterval(fetchMessages, 3000);
        return () => clearInterval(interval);
    }, [selectedContact, currentUser.id]);

    // Check for Private Key availability (Async)
    const [privateKeyAvailable, setPrivateKeyAvailable] = useState(false);

    useEffect(() => {
        const checkKey = async () => {
            if (!selectedContact || selectedContact.type !== 'room') {
                setPrivateKeyAvailable(true); // Always true for non-rooms
                return;
            }
            try {
                const key = await getPrivateKey(selectedContact.id);
                setPrivateKeyAvailable(!!key);
            } catch (e) {
                setPrivateKeyAvailable(false);
            }
        };
        checkKey();
    }, [selectedContact]);

    // Auto-scroll when messages change
    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // --- Crypto Helpers ---
    async function generateKeyPair() {
        return window.crypto.subtle.generateKey(
            {
                name: "RSA-OAEP",
                modulusLength: 2048,
                publicExponent: new Uint8Array([1, 0, 1]),
                hash: "SHA-256"
            },
            true,
            ["encrypt", "decrypt"]
        );
    }

    async function exportKey(key: CryptoKey) {
        const exported = await window.crypto.subtle.exportKey("spki", key);
        return btoa(String.fromCharCode(...new Uint8Array(exported)));
    }

    async function importPublicKey(pem: string) {
        const binaryDer = Uint8Array.from(atob(pem), c => c.charCodeAt(0));
        return window.crypto.subtle.importKey(
            "spki",
            binaryDer,
            { name: "RSA-OAEP", hash: "SHA-256" },
            true,
            ["encrypt"]
        );
    }

    // --- IndexedDB Helpers ---
    const openDB = () => {
        return new Promise<IDBDatabase>((resolve, reject) => {
            const request = indexedDB.open("DoryChatKeystore", 1);
            request.onupgradeneeded = (event) => {
                const db = (event.target as IDBOpenDBRequest).result;
                if (!db.objectStoreNames.contains("keys")) {
                    db.createObjectStore("keys");
                }
            };
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    };

    const storeKey = async (roomId: string, key: CryptoKey) => {
        const db = await openDB();
        return new Promise<void>((resolve, reject) => {
            const tx = db.transaction("keys", "readwrite");
            const store = tx.objectStore("keys");
            const req = store.put(key, roomId);
            req.onsuccess = () => resolve();
            req.onerror = () => reject(req.error);
        });
    };

    const getPrivateKey = async (roomId: string): Promise<CryptoKey | undefined> => {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction("keys", "readonly");
            const store = tx.objectStore("keys");
            const req = store.get(roomId);
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
        });
    };
    // --- End IndexedDB Helpers ---

    // Simple AES-GCM encryption
    async function encryptMessage(text: string, publicKeyPEM: string) {
        try {
            // 1. Generate AES Key
            const aesKey = await window.crypto.subtle.generateKey(
                { name: "AES-GCM", length: 256 },
                true,
                ["encrypt", "decrypt"]
            );

            // 2. Encrypt Text with AES
            const iv = window.crypto.getRandomValues(new Uint8Array(12));
            const encoder = new TextEncoder();
            const encryptedContent = await window.crypto.subtle.encrypt(
                { name: "AES-GCM", iv: iv },
                aesKey,
                encoder.encode(text)
            );

            // 3. Encrypt AES Key with RSA Public Key
            const publicKey = await importPublicKey(publicKeyPEM);
            const rawAesKey = await window.crypto.subtle.exportKey("raw", aesKey);
            const encryptedAesKey = await window.crypto.subtle.encrypt(
                { name: "RSA-OAEP" },
                publicKey,
                rawAesKey
            );

            // 4. Bundle (IV + EncryptedAESKey + EncryptedContent)
            // Format: JSON string
            return JSON.stringify({
                iv: Array.from(iv),
                k: Array.from(new Uint8Array(encryptedAesKey)),
                c: Array.from(new Uint8Array(encryptedContent))
            });
        } catch (e) {
            console.error("Encryption failed", e);
            return null;
        }
    }

    // Decrypt
    // We need our Private Key from storage
    // AND the message bundle
    async function decryptMessage(bundle: any, privateKey: CryptoKey) {
        try {
            const { iv, k, c } = typeof bundle === 'string' ? JSON.parse(bundle) : bundle;

            // 1. Decrypt AES Key with RSA Private Key
            const rawAesKey = await window.crypto.subtle.decrypt(
                { name: "RSA-OAEP" },
                privateKey,
                new Uint8Array(k)
            );

            // 2. Import AES Key
            const aesKey = await window.crypto.subtle.importKey(
                "raw",
                rawAesKey,
                { name: "AES-GCM" },
                false,
                ["decrypt"]
            );

            // 3. Decrypt Content
            const decryptedContent = await window.crypto.subtle.decrypt(
                { name: "AES-GCM", iv: new Uint8Array(iv) },
                aesKey,
                new Uint8Array(c)
            );

            return new TextDecoder().decode(decryptedContent);
        } catch (e) {
            console.error("Decryption failed", e);
            return "🔒 Encrypted Message";
        }
    }

    // Handle Create Room
    const handleCreateRoom = async () => {
        try {
            // Generate Keys
            const keyPair = await generateKeyPair();
            const publicKey = await exportKey(keyPair.publicKey);

            // Create Room
            const res = await fetch('/api/rooms', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: currentUser.id, publicKey })
            });

            if (res.ok) {
                const room = await res.json();

                // Store Private Key
                await storeKey(room._id, keyPair.privateKey);

                // Add to contacts list seamlessly
                const newContact = {
                    id: room._id,
                    name: `${room.code}`,
                    avatar: `https://api.dicebear.com/7.x/shapes/svg?seed=${room.code}`,
                    status: 'online',
                    unread: 0,
                    lastMessage: 'Encryption Enabled',
                    time: 'Just now',
                    type: 'room',
                    code: room.code,
                    participants: room.participants
                };

                setContacts(prev => [newContact, ...prev]);
                setSelectedContact(newContact);
                setMessageInput(""); // Reset input if any
            }
        } catch (e) { console.error(e); }
    };

    const handleJoinRoom = async () => {
        if (!searchQuery) return;
        try {
            const keyPair = await generateKeyPair();
            const publicKey = await exportKey(keyPair.publicKey);

            const res = await fetch('/api/rooms/join', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: currentUser.id, code: searchQuery, publicKey })
            });
            if (res.ok) {
                const room = await res.json();
                await storeKey(room._id, keyPair.privateKey);

                // Add to contacts list seamlessly
                const newContact = {
                    id: room._id,
                    name: `${room.code}`,
                    avatar: `https://api.dicebear.com/7.x/shapes/svg?seed=${room.code}`,
                    status: 'online',
                    unread: 0,
                    lastMessage: 'Encryption Enabled',
                    time: 'Just now',
                    type: 'room',
                    code: room.code,
                    participants: room.participants
                };

                setContacts(prev => [newContact, ...prev]);
                setSelectedContact(newContact);
                setSearchQuery(""); // Clear search
            } else {
                alert("Invalid Code or Room Full");
            }
        } catch (e) { console.error(e); }
    };

    async function importPrivateKey(pem: string) {
        const binaryDer = Uint8Array.from(atob(pem), c => c.charCodeAt(0));
        return window.crypto.subtle.importKey(
            "pkcs8",
            binaryDer,
            { name: "RSA-OAEP", hash: "SHA-256" },
            true,
            ["decrypt"]
        );
    }

    // --- End Crypto Helpers ---

    const handleSendMessage = async () => {
        if (!messageInput.trim() || !selectedContact) return;

        try {
            let finalPayload = messageInput;
            let type = selectedContact.type;

            if (type === 'room') {
                // E2EE Logic
                // 1. Get my Private Key
                const myKey = await getPrivateKey(selectedContact.id);
                if (!myKey) {
                    alert("No Private Key found for this room! You might have cleared your cache.");
                    return;
                }

                // 2. Identify Participants
                // We need to encrypt for ALL participants (including self)
                const participants = selectedContact.participants || [];
                // Simple logic: Encrypt for everyone in the list

                // Generate AES Key
                const aesKey = await window.crypto.subtle.generateKey(
                    { name: "AES-GCM", length: 256 },
                    true,
                    ["encrypt", "decrypt"]
                );
                const rawAesKey = await window.crypto.subtle.exportKey("raw", aesKey);

                // Encrypt Content
                const iv = window.crypto.getRandomValues(new Uint8Array(12));
                const encoder = new TextEncoder();
                const encryptedContent = await window.crypto.subtle.encrypt(
                    { name: "AES-GCM", iv: iv },
                    aesKey,
                    encoder.encode(messageInput)
                );

                const keys: Record<string, string> = {};

                for (const p of participants) {
                    if (p.publicKey) {
                        try {
                            const pubKey = await importPublicKey(p.publicKey);
                            const encryptedKey = await window.crypto.subtle.encrypt(
                                { name: "RSA-OAEP" },
                                pubKey,
                                rawAesKey
                            );
                            // Map User ID to Encrypted Key
                            // p.user might be an ID string or object depending on populate
                            const pId = typeof p.user === 'string' ? p.user : p.user?._id?.toString() || p.user?.toString();
                            keys[pId] = Array.from(new Uint8Array(encryptedKey)).toString();
                            // Storing as simple string in JSON is tricky, array is safer to stringify
                        } catch (e) { console.error("Key encrypt error for", p, e); }
                    }
                }

                finalPayload = JSON.stringify({
                    iv: Array.from(iv),
                    c: Array.from(new Uint8Array(encryptedContent)),
                    keys: keys // keys: { "userId": "123,23,0..." }
                });
            }

            const payload = {
                senderId: currentUser.id,
                receiverId: selectedContact.id,
                text: finalPayload,
                type: selectedContact.type
            };

            const res = await fetch('/api/messages', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                const savedMsg = await res.json();

                // For local display, we already know the text, no need to decrypt our own just-sent message
                // But to be consistent with data structure, we can just push the plaintext

                setMessages(prev => [...prev, {
                    id: savedMsg._id,
                    text: messageInput, // Show plaintext locally
                    createdAt: new Date(savedMsg.createdAt),
                    time: new Date(savedMsg.createdAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
                    isMe: true,
                    status: 'sent'
                }]);
                setMessageInput("");
            }
        } catch (err) {
            console.error("Failed to send", err);
        }
    };

    // Helper to calculate animation style
    const getExpirationStyle = (createdAt: Date) => {
        const TTL = 60 * 1000; // 60 seconds
        const elapsed = Date.now() - createdAt.getTime();

        // If expired, hidden
        if (elapsed >= TTL) return { opacity: 0 };

        // Continuous fade out over 60s
        // Start at opacity 1, end at opacity 0
        // We "start" the animation in the past based on how old the message is
        return {
            animation: `fadeOut ${TTL}ms linear forwards`,
            animationDelay: `-${elapsed}ms`
        };
    };


    // E2EE Status Check
    const secureConnectionReady = (() => {
        if (!selectedContact) return false;
        if (selectedContact.type !== 'room') return true;

        // 1. Private Key in IDB? (Async Check State)
        if (!privateKeyAvailable) return false;

        // 2. Participants >= 2
        const participants = selectedContact.participants || [];
        if (participants.length < 2) return false;

        // 3. All have Public Keys
        return participants.every((p: any) => p.publicKey);
    })();

    return (
        <div className="flex h-screen w-full bg-zinc-50 dark:bg-black text-zinc-900 dark:text-zinc-100 overflow-hidden font-sans">

            {/* Sidebar */}
            <aside className="w-80 border-r border-zinc-200 dark:border-zinc-800 flex flex-col bg-white dark:bg-zinc-950/50 backdrop-blur-xl">
                {/* ... Sidebar content unchanged ... */}
                <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between sticky top-0 bg-transparent z-10">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 flex items-center justify-center">
                            <img src="/dory-icon.png" alt="Logo" className="w-full h-full object-cover" />
                        </div>
                        <h1 className="font-bold text-xl tracking-tight">Dory<span className="text-blue-600">Chat</span></h1>
                    </div>
                </div>

                {/* Search & Actions */}
                <div className="p-4 space-y-3">
                    <div className="relative group">
                        <input
                            type="text"
                            placeholder="Enter endpoint code..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-zinc-100 dark:bg-zinc-900 border-none rounded-2xl py-2 pl-4 pr-4 text-sm focus:ring-2 focus:ring-blue-500/20 outline-none transition-all placeholder:text-zinc-500"
                        />
                    </div>

                    {/* Room Actions */}
                    <div className="flex gap-2">
                        <button
                            onClick={handleCreateRoom}
                            className="flex-1 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 py-2 rounded-xl text-xs font-bold hover:bg-blue-200 transition-colors"
                        >
                            + Create Endpoint
                        </button>
                        <button
                            onClick={handleJoinRoom}
                            className="flex-1 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 py-2 rounded-xl text-xs font-bold hover:bg-zinc-200 transition-colors"
                        >
                            Join w/ Code
                        </button>
                    </div>
                </div>

                {/* Contacts List */}
                <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-200 dark:scrollbar-thumb-zinc-800">
                    <div className="px-2">

                        {contacts.length === 0 && !searchQuery ? (
                            <div className="p-6 text-center text-zinc-500 italic text-sm">
                                No endpoints yet.<br />Create or Join one above!
                            </div>
                        ) : (
                            contacts.map((contact) => (
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

                                    {contact.type === 'room' && (
                                        <div
                                            onClick={async (e) => {
                                                e.stopPropagation();
                                                if (!confirm("Remove this endpoint?")) return;
                                                try {
                                                    const res = await fetch('/api/rooms/leave', {
                                                        method: 'POST',
                                                        headers: { 'Content-Type': 'application/json' },
                                                        body: JSON.stringify({ userId: currentUser.id, roomId: contact.id })
                                                    });
                                                    if (res.ok) {
                                                        setContacts(prev => prev.filter(c => c.id !== contact.id));
                                                        if (selectedContact?.id === contact.id) {
                                                            setSelectedContact(null);
                                                        }
                                                    }
                                                } catch (err) { console.error(err); }
                                            }}
                                            className={`p-2 rounded-full hover:bg-red-500/20 group/trash transition-colors ${selectedContact?.id === contact.id ? "text-blue-100 hover:text-white" : "text-zinc-400 hover:text-red-500"
                                                }`}
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </div>
                                    )}

                                    {contact.unread > 0 && (
                                        <div className={`px-2 py-0.5 rounded-full text-xs font-bold ${selectedContact?.id === contact.id
                                            ? "bg-white text-blue-600"
                                            : "bg-blue-600 text-white"
                                            }`}>
                                            {contact.unread}
                                        </div>
                                    )}
                                </button>
                            ))
                        )}
                    </div>
                </div>

                {/* User Profile Mini */}
                <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-purple-500 to-pink-500 shrink-0 overflow-hidden">
                        <img src={currentUser.avatar} alt="Me" className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate text-zinc-900 dark:text-zinc-100">{currentUser.name}</p>
                        <p className="text-[10px] text-zinc-400 truncate" title={sessionId}>ID: {sessionId.slice(0, 8)}...</p>
                    </div>
                </div>
            </aside>

            {/* Main Chat Area */}
            <main className="flex-1 flex flex-col min-w-0 bg-white dark:bg-zinc-950 relative">

                {/* Chat Header or Empty State */}
                {!selectedContact ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-slate-50 dark:bg-zinc-950/50">
                        <div className="w-20 h-20 bg-blue-100 dark:bg-blue-900/20 text-blue-600 rounded-3xl flex items-center justify-center mb-6 shadow-inner">
                            <MessageSquare className="w-10 h-10" />
                        </div>
                        <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">Secure Endpoints</h2>
                        <p className="text-zinc-500 dark:text-zinc-400 max-w-sm">
                            Create a Private Endpoint or enter a code to Join one. Share your code to start a secure, encrypted chat.
                        </p>
                    </div>
                ) : (
                    <>
                        <header className="h-16 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between px-6 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md sticky top-0 z-10">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center text-zinc-600 dark:text-zinc-300 font-bold overflow-hidden">
                                    {selectedContact.type === 'room' ? (
                                        <div className="text-xs text-center leading-none">
                                            <span className="block font-bold">RM</span>
                                        </div>
                                    ) : (
                                        <img src={selectedContact.avatar} alt={selectedContact.name} className="w-full h-full object-cover" />
                                    )}
                                </div>
                                <div>
                                    <h2 className="font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                                        {selectedContact.name}
                                        {selectedContact.type === 'room' && (
                                            <button
                                                onClick={() => {
                                                    navigator.clipboard.writeText(selectedContact.code || selectedContact.name);
                                                    setCopied(true);
                                                    setTimeout(() => setCopied(false), 2000);
                                                }}
                                                className="p-1 text-zinc-400 hover:text-blue-500 transition-colors"
                                                title="Copy Code"
                                            >
                                                {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                                            </button>
                                        )}
                                        {selectedContact.type === 'room' && !secureConnectionReady &&
                                            <span className="text-[10px] bg-amber-100 text-amber-600 px-2 py-0.5 rounded-full">Waiting for Talker</span>
                                        }
                                        {selectedContact.type === 'room' && secureConnectionReady &&
                                            <span className="text-[10px] bg-green-100 text-green-600 px-2 py-0.5 rounded-full">E2EE Secure</span>
                                        }
                                        {!secureConnectionReady && <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />}
                                        {secureConnectionReady && <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />}
                                    </h2>
                                    <p className="text-xs text-zinc-500">
                                        {selectedContact.type === 'room'
                                            ? `${selectedContact.participants?.length || 1} Participants`
                                            : 'Active now'
                                        }
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-1">
                                {/* Actions Removed */}
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
                                    className={`flex gap-3 max-w-3xl w-full ${msg.isMe ? "justify-end ml-auto" : "justify-start"}`}
                                    style={getExpirationStyle(msg.createdAt)}
                                >
                                    {!msg.isMe && selectedContact && (
                                        <div className="w-8 h-8 rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center text-xs font-bold shrink-0 self-end overflow-hidden">
                                            <img src={selectedContact.avatar} alt="Avatar" className="w-full h-full object-cover" />
                                        </div>
                                    )}

                                    <div className={`group relative px-5 pt-3 pb-6 rounded-2xl shadow-sm text-sm leading-relaxed max-w-[80%] ${msg.isMe
                                        ? "bg-blue-600 text-white rounded-br-none"
                                        : "bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 rounded-bl-none border border-zinc-100 dark:border-zinc-800"
                                        }`}>
                                        <p>{msg.text}</p>
                                        <span className={`text-[10px] absolute bottom-1 ${msg.isMe ? "right-3 text-blue-100/70" : "left-3 text-zinc-400"
                                            } flex items-center gap-1`}>
                                            {msg.time}
                                            {msg.isMe && (
                                                <span className="ml-1">
                                                    {msg.status === 'read' || msg.status === 'delivered' ? (
                                                        <CheckCheck className="w-3 h-3" />
                                                    ) : (
                                                        <Check className="w-3 h-3" />
                                                    )}
                                                </span>
                                            )}
                                        </span>
                                    </div>
                                </div>
                            ))}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Chat Input */}
                        <div className="p-4 bg-white dark:bg-zinc-950/80 backdrop-blur-md border-t border-zinc-200 dark:border-zinc-800">
                            <div className="flex items-center gap-2 max-w-5xl mx-auto">

                                <div className="flex-1 relative">
                                    <input
                                        type="text"
                                        value={messageInput}
                                        onChange={(e) => setMessageInput(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && secureConnectionReady && handleSendMessage()}
                                        placeholder={secureConnectionReady
                                            ? "Type a secured message..."
                                            : "Waiting for secure connection (2+ participants)..."
                                        }
                                        disabled={!secureConnectionReady}
                                        className={`w-full bg-zinc-100 dark:bg-zinc-900 border-none rounded-xl py-3 pl-4 pr-4 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all ${!secureConnectionReady ? 'opacity-50 cursor-not-allowed' : ''
                                            }`}
                                    />
                                </div>

                                <button
                                    onClick={handleSendMessage}
                                    disabled={!messageInput.trim() || !secureConnectionReady}
                                    className={`p-3 rounded-xl transition-all ${messageInput.trim() && secureConnectionReady
                                        ? "bg-blue-600 text-white shadow-lg shadow-blue-500/30 hover:bg-blue-700 hover:scale-105 active:scale-95"
                                        : "bg-zinc-100 dark:bg-zinc-800/50 text-zinc-400 cursor-not-allowed"
                                        }`}>
                                    <Send className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </main>

        </div>
    );
}
