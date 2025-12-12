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
    Copy,
    ArrowLeft
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import AgreementModal from './AgreementModal';
import { CLIENT_MESSAGE_TTL_MS, CLIENT_MESSAGE_FADE_START_MS } from "@/lib/config";

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
    // Start with no contact selected - user will select one (works for both mobile and desktop)
    const [selectedContact, setSelectedContact] = useState<any>(null);
    const [messageInput, setMessageInput] = useState("");
    const [messages, setMessages] = useState<any[]>([]);
    
    // Mobile view handlers: on mobile, show sidebar when no contact selected, show chat when contact selected
    const handleContactSelect = (contact: any) => {
        setSelectedContact(contact);
    };
    
    const handleBackToSidebar = () => {
        setSelectedContact(null);
    };

    // Search State
    const [searchQuery, setSearchQuery] = useState("");
    const [copied, setCopied] = useState(false);
    const [isCoolingDown, setIsCoolingDown] = useState(false);
    const [isCreateCoolingDown, setIsCreateCoolingDown] = useState(false);
    const [createCooldownSeconds, setCreateCooldownSeconds] = useState(0);
    const [messageCooldownSeconds, setMessageCooldownSeconds] = useState(0);
    const [longPressingContactId, setLongPressingContactId] = useState<string | null>(null);
    const [showSettings, setShowSettings] = useState(false);
    const [language, setLanguage] = useState<'en' | 'ru'>('en');
    const [joinError, setJoinError] = useState<string | null>(null);

    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Translations
    const translations = {
        en: {
            appName: 'DoryChat',
            settings: 'Settings',
            language: 'Language',
            english: 'English',
            russian: 'Русский',
            enterCode: 'Enter endpoint code...',
            createEndpoint: 'Create Endpoint',
            joinWithCode: 'Join w/ Code',
            noEndpoints: 'No endpoints yet.',
            createOrJoin: 'Create or Join one above!',
            secureEndpoints: 'Secure Endpoints',
            secureEndpointsDesc: 'Create a Private Endpoint or enter a code to Join one. Share your code to start a secure, encrypted chat.',
            participants: 'Participants',
            activeNow: 'Active now',
            today: 'Today',
            typeMessage: 'Type a secured message...',
            waitingConnection: 'Waiting for secure connection (2+ participants)...',
            messagingCooldown: 'Messaging cooldown',
            waitingForTalker: 'Waiting for Talker',
            e2eeSecure: 'E2EE Secure',
            removeEndpoint: 'Remove this endpoint?',
            cooldown: 'Cooldown',
            encryptionEnabled: 'Encryption Enabled',
            id: 'ID',
            errorEmptyCode: 'Please enter an endpoint code',
            errorRoomNotFound: 'Room not found or is full',
            backToRooms: 'Back to rooms',
            copyCode: 'Copy Code',
            alertCooldown: 'Please wait 30 seconds before creating another endpoint.',
            alertNoPrivateKey: 'No Private Key found for this room! You might have cleared your cache.',
            messagingCooldownPlaceholder: 'Messaging cooldown'
        },
        ru: {
            appName: 'DoryChat',
            settings: 'Настройки',
            language: 'Язык',
            english: 'English',
            russian: 'Русский',
            enterCode: 'Введите код точки...',
            createEndpoint: '+ Создать точку',
            joinWithCode: 'Войти по коду',
            noEndpoints: 'Нет точек.',
            createOrJoin: 'Создайте или присоединитесь!',
            secureEndpoints: 'Защищённые точки',
            secureEndpointsDesc: 'Создайте приватную точку или введите код для присоединения. Поделитесь кодом для начала зашифрованного чата.',
            participants: 'Участники',
            activeNow: 'Сейчас активен',
            today: 'Сегодня',
            typeMessage: 'Введите сообщение...',
            waitingConnection: 'Ожидание подключения (2+ участника)...',
            messagingCooldown: 'Задержка отправки',
            waitingForTalker: 'Ожидание собеседника',
            e2eeSecure: 'E2EE защита',
            removeEndpoint: 'Удалить эту точку?',
            cooldown: 'Задержка',
            encryptionEnabled: 'Шифрование включено',
            id: 'ID',
            errorEmptyCode: 'Введите код точки',
            errorRoomNotFound: 'Комната не найдена или заполнена',
            backToRooms: 'Вернуться к списку комнат',
            copyCode: 'Скопировать код',
            alertCooldown: 'Пожалуйста, подождите 30 секунд перед созданием новой точки.',
            alertNoPrivateKey: 'Приватный ключ для этой комнаты не найден! Возможно, вы очистили кэш.',
            messagingCooldownPlaceholder: 'Задержка отправки'
        }
    };

    const t = (key: keyof typeof translations.en) => translations[language][key];

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
        if (isCreateCoolingDown) {
            alert(t('alertCooldown'));
            return;
        }

        try {
            // Apply Rate Limit
            setIsCreateCoolingDown(true);
            setCreateCooldownSeconds(30);

            const interval = setInterval(() => {
                setCreateCooldownSeconds(prev => {
                    if (prev <= 1) {
                        clearInterval(interval);
                        setIsCreateCoolingDown(false);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
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
        // Clear previous error
        setJoinError(null);

        // Validate input
        if (!searchQuery || !searchQuery.trim()) {
            setJoinError(t('errorEmptyCode'));
            return;
        }

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
                setJoinError(null); // Clear error
            } else {
                setJoinError(t('errorRoomNotFound'));
            }
        } catch (e) {
            console.error(e);
            setJoinError(t('errorRoomNotFound'));
        }
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
        if (!messageInput.trim() || !selectedContact || isCoolingDown) return;

        // Rate Limit
        setIsCoolingDown(true);
        setMessageCooldownSeconds(3);

        const interval = setInterval(() => {
            setMessageCooldownSeconds(prev => {
                if (prev <= 1) {
                    clearInterval(interval);
                    setIsCoolingDown(false);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        try {
            let finalPayload = messageInput;
            let type = selectedContact.type;

            if (type === 'room') {
                // E2EE Logic
                // 1. Get my Private Key
                const myKey = await getPrivateKey(selectedContact.id);
                if (!myKey) {
                    alert(t('alertNoPrivateKey'));
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
        const TTL = CLIENT_MESSAGE_TTL_MS; // Configurable TTL from environment
        const FADE_START = CLIENT_MESSAGE_FADE_START_MS; // Configurable fade start
        
        // If TTL is zero or less, messages never expire (persist indefinitely)
        if (TTL <= 0) {
            return { opacity: 1 };
        }
        
        const elapsed = Date.now() - createdAt.getTime();

        // If expired, hidden
        if (elapsed >= TTL) return { opacity: 0, display: 'none' };

        // If in the fade period, fade out quickly
        if (elapsed >= FADE_START) {
            const fadeProgress = (elapsed - FADE_START) / (TTL - FADE_START);
            return { opacity: 1 - fadeProgress, transition: 'opacity 0.3s ease-out' };
        }

        // Otherwise, full opacity
        return { opacity: 1 };
    };


    // Helper function to get room status
    const getRoomStatus = (contact: any) => {
        if (!contact || contact.type !== 'room') return { text: null, isReady: false };
        
        const participants = contact.participants || [];
        const hasEnoughParticipants = participants.length >= 2;
        const allHavePublicKeys = participants.every((p: any) => p.publicKey);
        
        // For sidebar, we check if room is ready (we can't check privateKeyAvailable for all rooms)
        // So we'll show status based on participants and public keys
        if (hasEnoughParticipants && allHavePublicKeys) {
            return { text: t('e2eeSecure'), isReady: true };
        } else {
            return { text: t('waitingForTalker'), isReady: false };
        }
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
            <AgreementModal />

            {/* Sidebar - Fullscreen on mobile when no contact selected, sidebar on desktop */}
            <aside className={`${selectedContact ? 'hidden md:flex' : 'flex'} w-full md:w-80 border-r border-zinc-200 dark:border-zinc-800 flex-col bg-white dark:bg-zinc-950/50 backdrop-blur-xl`}>
                {/* ... Sidebar content unchanged ... */}
                <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between sticky top-0 bg-transparent z-10">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 flex items-center justify-center">
                            <img src="/dory-icon.png" alt="Logo" className="w-full h-full object-cover" />
                        </div>
                        <h1 className="font-bold text-xl tracking-tight">Dory<span className="text-blue-600">Chat</span></h1>
                    </div>
                    <button
                        className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-zinc-600 dark:text-zinc-400"
                        onClick={() => setShowSettings(!showSettings)}
                    >
                        <Settings className="w-5 h-5" />
                    </button>
                </div>

                {/* Search & Actions */}
                <div className="p-4 space-y-3">
                    <div className="relative group">
                        <input
                            type="text"
                            placeholder={t('enterCode')}
                            value={searchQuery}
                            onChange={(e) => {
                                setSearchQuery(e.target.value);
                                setJoinError(null); // Clear error on input change
                            }}
                            className="w-full bg-zinc-100 dark:bg-zinc-900 border-none rounded-2xl py-2 pl-4 pr-4 text-sm focus:ring-2 focus:ring-blue-500/20 outline-none transition-all placeholder:text-zinc-500"
                        />
                        {joinError && (
                            <div className="mt-2 text-xs text-red-500 dark:text-red-400 font-medium px-1">
                                {joinError}
                            </div>
                        )}
                    </div>

                    {/* Room Actions */}
                    <div className="flex gap-2">
                        <button
                            onClick={handleCreateRoom}
                            disabled={isCreateCoolingDown}
                            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-colors ${isCreateCoolingDown
                                ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-400 cursor-not-allowed"
                                : "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-200"
                                }`}
                        >
                            {isCreateCoolingDown ? `+ ${t('cooldown')} (${createCooldownSeconds}s)` : t('createEndpoint')}
                        </button>
                        <button
                            onClick={handleJoinRoom}
                            className="flex-1 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 py-2 rounded-xl text-xs font-bold hover:bg-zinc-200 transition-colors"
                        >
                            {t('joinWithCode')}
                        </button>
                    </div>
                </div>

                {/* Contacts List */}
                <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-200 dark:scrollbar-thumb-zinc-800">
                    <div className="px-2">

                        {contacts.length === 0 && !searchQuery ? (
                            <div className="p-6 text-center text-zinc-500 italic text-sm">
                                {t('noEndpoints')}<br />{t('createOrJoin')}
                            </div>
                        ) : (
                            contacts.map((contact) => (
                                <button
                                    key={contact.id}
                                    onClick={() => handleContactSelect(contact)}
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
                                        {contact.status === "online" && contact.type !== 'room' && (
                                            <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white dark:border-zinc-950 rounded-full" />
                                        )}
                                        {contact.type === 'room' && (() => {
                                            const status = getRoomStatus(contact);
                                            return (
                                                <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white dark:border-zinc-950 ${status.isReady ? 'bg-green-500' : 'bg-amber-500'} animate-pulse`} />
                                            );
                                        })()}
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
                                            {contact.type === 'room' ? (() => {
                                                const status = getRoomStatus(contact);
                                                if (status.text) {
                                                    return (
                                                        <span className={`text-[10px] ${status.isReady 
                                                            ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400' 
                                                            : 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400'
                                                        } px-2 py-0.5 rounded-full`}>
                                                            {status.text}
                                                        </span>
                                                    );
                                                }
                                                return contact.lastMessage;
                                            })() : contact.lastMessage}
                                        </p>
                                    </div>

                                    {contact.type === 'room' && (
                                        <div
                                            onPointerDown={(e) => {
                                                e.stopPropagation();
                                                const target = e.currentTarget as HTMLElement;

                                                // Start animation
                                                setLongPressingContactId(contact.id);

                                                // Store timer on element
                                                (target as any)._longPressTimer = setTimeout(async () => {
                                                    // Long press - delete without confirmation
                                                    setLongPressingContactId(null);
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
                                                }, 2000); // 2 seconds
                                            }}
                                            onPointerUp={(e) => {
                                                e.stopPropagation();
                                                const target = e.currentTarget as HTMLElement;

                                                // Clear animation and timer - no deletion on release
                                                setLongPressingContactId(null);

                                                if ((target as any)._longPressTimer) {
                                                    clearTimeout((target as any)._longPressTimer);
                                                    (target as any)._longPressTimer = null;
                                                }
                                            }}
                                            onPointerLeave={(e) => {
                                                const target = e.currentTarget as HTMLElement;
                                                setLongPressingContactId(null);
                                                if ((target as any)._longPressTimer) {
                                                    clearTimeout((target as any)._longPressTimer);
                                                    (target as any)._longPressTimer = null;
                                                }
                                            }}
                                            className={`relative p-2 rounded-full hover:bg-red-500/20 group/trash transition-all ${selectedContact?.id === contact.id ? "text-blue-100 hover:text-white" : "text-zinc-400 hover:text-red-500"
                                                }`}
                                        >
                                            {/* Progress ring */}
                                            {longPressingContactId === contact.id && (
                                                <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 32 32">
                                                    <circle
                                                        cx="16"
                                                        cy="16"
                                                        r="14"
                                                        fill="none"
                                                        stroke="currentColor"
                                                        strokeWidth="2"
                                                        className="text-red-500"
                                                        strokeDasharray="87.96"
                                                        strokeDashoffset="87.96"
                                                        style={{
                                                            animation: 'fillProgress 2s linear forwards'
                                                        }}
                                                    />
                                                </svg>
                                            )}
                                            <Trash2 className="w-4 h-4 relative z-10" />
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
                <div className="h-[72px] border-t border-zinc-200 dark:border-zinc-800 flex items-center gap-3 px-4">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-purple-500 to-pink-500 shrink-0 overflow-hidden">
                        {currentUser.avatar && <img src={currentUser.avatar} alt="Me" className="w-full h-full object-cover" />}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate text-zinc-900 dark:text-zinc-100">{currentUser.name}</p>
                        <p className="text-[10px] text-zinc-400 truncate" title={sessionId}>ID: {sessionId.slice(0, 8)}...</p>
                    </div>
                </div>
            </aside>

            {/* Settings Modal */}
            {showSettings && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
                    onClick={() => setShowSettings(false)}
                >
                    <div
                        className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl p-6 w-96"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">{t('settings')}</h2>
                            <button
                                onClick={() => setShowSettings(false)}
                                className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                            >
                                <span className="text-zinc-500 text-xl">×</span>
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-3">
                                    {t('language')}
                                </label>
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        onClick={() => {
                                            setLanguage('en');
                                            setShowSettings(false);
                                        }}
                                        className={`p-3 rounded-xl font-medium transition-all ${language === 'en'
                                            ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                                            : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                                            }`}
                                    >
                                        🇬🇧 {t('english')}
                                    </button>
                                    <button
                                        onClick={() => {
                                            setLanguage('ru');
                                            setShowSettings(false);
                                        }}
                                        className={`p-3 rounded-xl font-medium transition-all ${language === 'ru'
                                            ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                                            : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                                            }`}
                                    >
                                        🇷🇺 {t('russian')}
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Creator Credit */}
                        <div className="mt-6 pt-4 border-t border-zinc-200 dark:border-zinc-800 text-center">
                            <p className="text-xs text-zinc-500 dark:text-zinc-400">
                                Created by{' '}
                                <a
                                    href="https://demensdeum.com"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
                                >
                                    DemensDeum
                                </a>
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Main Chat Area - Fullscreen on mobile when contact selected, normal on desktop */}
            <main className={`${selectedContact ? 'flex' : 'hidden md:flex'} flex-1 flex-col min-w-0 bg-white dark:bg-zinc-950 relative`}>

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
                        <header className="h-16 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between px-6 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md sticky top-0 z-10" style={{ marginTop: '5px' }}>
                            <div className="flex items-center gap-4">
                                {/* Back button - visible only on mobile */}
                                <button
                                    onClick={handleBackToSidebar}
                                    className="md:hidden p-2 -ml-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-zinc-600 dark:text-zinc-400"
                                    aria-label={t('backToRooms')}
                                >
                                    <ArrowLeft className="w-5 h-5" />
                                </button>
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
                                                title={t('copyCode')}
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
                                            ? `${selectedContact.participants?.length || 1} ${t('participants')}`
                                            : t('activeNow')
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
                                <span className="text-xs font-medium text-zinc-400 bg-zinc-100 dark:bg-zinc-900 px-3 py-1 rounded-full">{t('today')}</span>
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
                        <div className="h-[72px] bg-white dark:bg-zinc-950/80 backdrop-blur-md border-t border-zinc-200 dark:border-zinc-800 flex items-center">
                            <div className="flex items-center gap-2 max-w-5xl mx-auto w-full px-4">


                                <div className="flex-1 relative">
                                    <input
                                        type="text"
                                        value={messageInput}
                                        maxLength={280}
                                        onChange={(e) => setMessageInput(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && secureConnectionReady && !isCoolingDown && handleSendMessage()}
                                        placeholder={secureConnectionReady
                                            ? (isCoolingDown ? `${t('messagingCooldownPlaceholder')} (${messageCooldownSeconds}s)...` : t('typeMessage'))
                                            : t('waitingConnection')
                                        }
                                        disabled={!secureConnectionReady || isCoolingDown}
                                        className={`w-full bg-zinc-100 dark:bg-zinc-900 border-none rounded-xl py-3 pl-4 pr-16 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all ${!secureConnectionReady || isCoolingDown ? 'opacity-50 cursor-not-allowed' : ''
                                            }`}
                                    />
                                    {messageInput.length > 0 && (
                                        <div className={`absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium ${messageInput.length > 250 ? 'text-red-500' : 'text-zinc-400'
                                            }`}>
                                            {280 - messageInput.length}
                                        </div>
                                    )}
                                </div>

                                <button
                                    onClick={handleSendMessage}
                                    disabled={!messageInput.trim() || !secureConnectionReady || isCoolingDown}
                                    className={`p-3 rounded-xl transition-all ${messageInput.trim() && secureConnectionReady && !isCoolingDown
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
