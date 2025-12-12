# DoryChat

**DoryChat** is a secure, ephemeral instant messaging platform built on a zero-persistence architectural model. Messages are temporary, encrypted end-to-end, and automatically expire after 60 seconds—ensuring that conversations leave no trace on the central infrastructure.

---

## 🔐 Key Features

### **End-to-End Encryption (E2EE)**
- **Hybrid Encryption**: RSA-OAEP (2048-bit) for key exchange + AES-GCM (256-bit) for message content
- **Secure Key Storage**: Private keys stored as `CryptoKey` objects in IndexedDB (not exposed as strings)
- **Web Crypto API**: All cryptographic operations use the browser's native `window.crypto.subtle`

### **Ephemeral Messaging**
- **Configurable TTL**: Messages automatically expire and are deleted from the database after a configurable time (default: 60 seconds)
- **Persistent Mode**: Set TTL to 0 or less to disable expiration - messages will persist indefinitely
- **Continuous Fade-Out**: Visual opacity animation shows message age in real-time (disabled when TTL <= 0)
- **Backend-Managed Cleanup**: Lazy deletion on every API request ensures no persistent storage (skipped when TTL <= 0)

### **Private Endpoints**
- **Room-Based Communication**: Create or join secure chat rooms using unique 6-character codes
- **Multi-Participant Support**: Rooms support multiple users with individual key pairs
- **Delivery Status**: Double-tick indicators show when messages are delivered to other participants

### **Rate Limiting**
- **Message Sending**: 1 message per 3 seconds (with live countdown timer)
- **Endpoint Creation**: 1 new room per 30 seconds (with live countdown timer)

### **Session Management**
- **Automatic Guest Provisioning**: Users are assigned a unique session ID via middleware
- **No Registration Required**: Start chatting immediately without creating an account

---

## 🛠️ Tech Stack

- **Framework**: [Next.js 16](https://nextjs.org/) (App Router)
- **Frontend**: React 19, TypeScript, Tailwind CSS 4
- **Backend**: Next.js API Routes (Server Components)
- **Database**: MongoDB with Mongoose ODM
- **Cryptography**: Web Crypto API (RSA-OAEP, AES-GCM)
- **Icons**: Lucide React

---

## 📦 Installation

### Prerequisites
- Node.js 20+
- MongoDB instance (local or cloud, e.g., MongoDB Atlas)

### Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/yourusername/DoryChat.git
   cd DoryChat/dory-chat
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure environment variables**:
   Create a `.env.local` file in the `dory-chat` directory:
   ```env
   MONGODB_URI=mongodb://localhost:27017/dory-chat
   # Or use MongoDB Atlas:
   # MONGODB_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/dory-chat
   
   # Message Lifetime Configuration (optional)
   # Set message TTL in milliseconds (default: 60000 = 60 seconds)
   NEXT_PUBLIC_MESSAGE_TTL_MS=60000
   
   # Room Lifetime Configuration (optional)
   # Set room TTL in milliseconds (default: 0 = rooms never expire)
   NEXT_PUBLIC_ROOM_TTL_MS=0
   
   # Endpoint Creation Cooldown (optional)
   # Set cooldown in seconds before creating another endpoint (default: 10 seconds)
   NEXT_PUBLIC_ENDPOINT_CREATION_COOLDOWN_SECONDS=10
   
   # Message Send Cooldown (optional)
   # Set cooldown in seconds before sending another message (default: 2 seconds)
   NEXT_PUBLIC_MESSAGE_SEND_COOLDOWN_SECONDS=2
   
   # Examples:
   # Messages: 2 minutes: NEXT_PUBLIC_MESSAGE_TTL_MS=120000
   # Messages: 30 seconds: NEXT_PUBLIC_MESSAGE_TTL_MS=30000
   # Messages: disable expiration: NEXT_PUBLIC_MESSAGE_TTL_MS=0
   # Rooms: expire after 1 hour: NEXT_PUBLIC_ROOM_TTL_MS=3600000
   # Rooms: expire after 24 hours: NEXT_PUBLIC_ROOM_TTL_MS=86400000
   # Rooms: never expire (default): NEXT_PUBLIC_ROOM_TTL_MS=0
   ```

4. **Run the development server**:
   ```bash
   npm run dev
   ```

5. **Open the app**:
   Navigate to [http://localhost:3000](http://localhost:3000)

---

## 🚀 Usage

### Creating a Secure Endpoint
1. Click **"+ Create Endpoint"** in the sidebar
2. A unique 6-character code is generated (e.g., `A1B2C3`)
3. Share this code with others to invite them to the room

### Joining an Endpoint
1. Enter the 6-character code in the input field
2. Click **"Join w/ Code"**
3. You'll be added to the room and can start chatting securely

### Sending Messages
- Messages are **only sent** when:
  - The room has **2+ participants**
  - All participants have **public keys** (E2EE ready)
  - The **3-second cooldown** has elapsed
- Messages are **encrypted** for all participants before being sent to the server

### Message Lifecycle
1. **Sent**: Message is created and stored in MongoDB
2. **Delivered**: Another participant fetches the message (double-tick indicator)
3. **Expired**: After the configured TTL (default: 60 seconds), the message is deleted from the database

---

## 🏗️ Architecture

### Database Schema

#### **User**
```typescript
{
  sessionId: string;      // Unique session identifier
  name: string;           // Display name (e.g., "Guest 1234")
  avatar: string;         // Dicebear avatar URL
  contacts: ObjectId[];   // References to other users
  rooms: ObjectId[];      // References to joined rooms
  createdAt: Date;
}
```

#### **Room**
```typescript
{
  code: string;           // Unique 6-character code
  name?: string;          // Optional room name
  participants: [{
    user: ObjectId;       // Reference to User
    publicKey: string;    // RSA public key (SPKI PEM format)
  }];
  createdAt: Date;
}
```

#### **Message**
```typescript
{
  senderId: ObjectId;     // Reference to sender User
  receiverId: ObjectId;   // Reference to Room (or User for DMs)
  text: string;           // Encrypted JSON payload or plaintext
  status: 'sent' | 'delivered' | 'read';
  createdAt: Date;        // Used for TTL calculation
}
```

### Encryption Flow

#### **Sending a Message**
1. Generate a random AES-GCM key
2. Encrypt the message content with the AES key
3. For each participant, encrypt the AES key with their RSA public key
4. Send a JSON payload to the server:
   ```json
   {
     "iv": [12, 34, 56, ...],           // Initialization vector
     "c": [78, 90, 12, ...],            // Encrypted content
     "keys": {
       "userId1": "123,45,67,...",      // Encrypted AES key for user 1
       "userId2": "89,01,23,..."        // Encrypted AES key for user 2
     }
   }
   ```

#### **Receiving a Message**
1. Fetch the encrypted payload from the server
2. Retrieve your private RSA key from IndexedDB
3. Decrypt the AES key using your private key
4. Decrypt the message content using the AES key
5. Display the plaintext message

---

## 🔒 Security Considerations

- **Client-Side Encryption**: All encryption/decryption happens in the browser
- **No Server Access to Keys**: The server never sees private keys or plaintext messages
- **IndexedDB Storage**: Private keys are stored securely in the browser's IndexedDB (not `localStorage`)
- **Ephemeral by Design**: Messages are automatically deleted after a configurable TTL (default: 60 seconds)
- **Rate Limiting**: Prevents spam and abuse

### ⚠️ Important Notes
- **Key Loss**: If you clear browser data, you'll lose access to old rooms (keys are not recoverable)
- **No Backup**: There is no key backup or recovery mechanism
- **Trust Model**: You must trust that other participants are who they claim to be (no identity verification)

---

## 📝 Development

### Project Structure
```
dory-chat/
├── src/
│   ├── app/
│   │   ├── api/              # API routes (messages, rooms, contacts)
│   │   ├── layout.tsx        # Root layout
│   │   └── page.tsx          # Home page (server component)
│   ├── components/
│   │   └── ChatView.tsx      # Main chat UI (client component)
│   ├── lib/
│   │   └── db.ts             # MongoDB connection helper
│   ├── models/
│   │   ├── User.ts           # Mongoose User schema
│   │   ├── Room.ts           # Mongoose Room schema
│   │   └── Message.ts        # Mongoose Message schema
│   └── middleware.ts         # Session management
├── public/
│   └── dory-icon.png         # Custom logo
└── package.json
```

### Available Scripts
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

---

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

---

## 🙏 Acknowledgments

- Built with [Next.js](https://nextjs.org/)
- Icons by [Lucide](https://lucide.dev/)
- Avatars by [DiceBear](https://dicebear.com/)
