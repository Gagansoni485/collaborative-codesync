# CodeSync - Real-Time Collaborative Code Editor

A modern, real-time collaborative code editor with live cursors, instant sync, AI assistance, and code execution capabilities. Built with React, TypeScript, Tailwind CSS, and shadcn/ui.

## ✨ Features

- 🎨 **Beautiful Modern UI** - Built with React, TypeScript, Tailwind CSS, and shadcn/ui components
- 👥 **Real-Time Collaboration** - Multiple users can edit code simultaneously with live cursors
- 🔄 **Instant Sync** - Changes appear in milliseconds using Yjs and WebSocket
- 🤖 **AI Assistant** - Get code explanations and suggestions powered by OpenAI
- ▶️ **Code Execution** - Run JavaScript, Python, Java, and C++ code directly in the browser
- 🔐 **Secure Authentication** - JWT-based user authentication with bcrypt password hashing
- 🌙 **Dark Theme** - Eye-friendly dark theme optimized for coding
- 📱 **Responsive Design** - Works seamlessly on desktop and mobile devices

## 🚀 Tech Stack

### Frontend
- React 19 with TypeScript
- Vite for fast development
- Tailwind CSS for styling
- shadcn/ui for beautiful components
- Monaco Editor for code editing
- Yjs for CRDT-based collaboration
- Socket.io-client for real-time communication
- React Router for navigation
- Sonner for toast notifications

### Backend
- Node.js with Express
- MongoDB with Mongoose
- Socket.io for WebSocket connections
- JWT for authentication
- OpenAI/Gemini API for AI assistance
- JDoodle API for code execution (Python, Java, C++)
- Local Node.js execution for JavaScript
- Yjs with y-websocket for collaboration

## 📦 Getting Started

### Prerequisites
- Node.js (v18 or higher)
- MongoDB (local or Atlas)
- Gemini API key (for AI features) - Get it from [Google AI Studio](https://makersuite.google.com/app/apikey)
- JDoodle API credentials (optional, for Python/Java/C++ execution) - Get free tier from [JDoodle](https://www.jdoodle.com/compiler-api)

### Installation

1. **Clone the repository**
```bash
git clone <your-repo-url>
cd <project-folder>
```

2. **Install backend dependencies**
```bash
cd backend
npm install
```

3. **Install frontend dependencies**
```bash
cd ../frontend
npm install
```

4. **Configure environment variables**

Create a `.env` file in the `backend` folder:
```env
# MongoDB Configuration
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret_key

# Server Configuration
PORT=1600

# AI Provider (Gemini recommended)
GEMINI_API_KEY=your_gemini_api_key

# Code Execution (Optional - for Python, Java, C++)
# JavaScript runs locally without these
JDOODLE_CLIENT_ID=your_jdoodle_client_id
JDOODLE_CLIENT_SECRET=your_jdoodle_client_secret

# Room Configuration
MAX_ROOM_MEMBERS=4
```

**Getting API Keys:**
- **Gemini API**: Get free API key from [Google AI Studio](https://makersuite.google.com/app/apikey)
- **JDoodle API** (Optional): Get free tier (200 requests/day) from [JDoodle](https://www.jdoodle.com/compiler-api)

### Running the Application

1. **Start the backend server**
```bash
cd backend
node index.mjs
```
The server will start on `http://localhost:1600`

2. **Start the frontend development server**
```bash
cd frontend
npm run dev
```
The frontend will start on `http://localhost:5173`

3. **Open your browser**
Navigate to `http://localhost:5173`

## 🎯 How to Use

### 1. Sign Up / Login
- Create a new account or login with existing credentials
- Your session is securely stored with JWT tokens

### 2. Create or Join a Room
- Generate a new room ID or enter an existing one
- Set your display name for the collaboration session
- Share the room ID with others to code together

### 3. Collaborate in Real-Time
- Write code in the Monaco editor
- See other users' cursors and selections in real-time
- Changes sync instantly across all connected users
- Select your programming language from the sidebar

### 4. Execute Code
- Write your code in the editor
- Provide input in the console panel (if needed)
- Click "Execute Code" to run it
- View output in the console

### 5. Use AI Assistant
- Ask questions about your code
- Get explanations, suggestions, and debugging help
- AI responses appear in the assistant panel

## 📁 Project Structure

```
├── backend/
│   ├── middleware/
│   │   └── authmiiddle.js      # JWT authentication middleware
│   ├── models/
│   │   └── user.js             # User model
│   ├── routes/
│   │   └── auth.js             # Authentication routes
│   ├── config.js               # Configuration
│   └── index.mjs               # Main server file
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── ui/             # shadcn/ui components (50+)
│   │   │   └── NavLink.tsx     # Navigation component
│   │   ├── hooks/              # Custom React hooks
│   │   ├── lib/
│   │   │   └── utils.ts        # Utility functions
│   │   ├── pages/
│   │   │   ├── Index.tsx       # Landing page
│   │   │   ├── Login.tsx       # Login page
│   │   │   ├── Signup.tsx      # Signup page
│   │   │   ├── EditorPage.tsx  # Main editor page
│   │   │   └── NotFound.tsx    # 404 page
│   │   ├── App.tsx             # Main app component
│   │   ├── main.tsx            # Entry point
│   │   └── index.css           # Global styles
│   ├── tailwind.config.ts      # Tailwind configuration
│   ├── tsconfig.json           # TypeScript configuration
│   └── vite.config.js          # Vite configuration
│
└── README.md
```

## 🔌 API Endpoints

### Authentication
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/logout` - Logout user

### AI Assistant
- `POST /api/ai-explain` - Get AI explanation for code

## 🔄 Socket Events

### Client → Server
- `join` - Join a collaboration room
- `leaveRoom` - Leave the current room
- `codeChange` - Broadcast code changes
- `typing` - Notify others of typing activity
- `languageChange` - Change programming language
- `compilecode` - Execute code

### Server → Client
- `userJoined` - User list update
- `joinedRoom` - Successful room join
- `codeUpdate` - Code changes from other users
- `userTyping` - Typing indicator
- `languageUpdate` - Language change notification
- `codeResponse` - Code execution result
- `error` - Error messages

## 🛠️ Supported Languages

- **JavaScript** - Runs locally using Node.js (no external API needed)
- **Python** - Requires JDoodle API credentials
- **Java** - Requires JDoodle API credentials
- **C++** - Requires JDoodle API credentials

**Note:** JavaScript code execution works out of the box. For Python, Java, and C++, you need to configure JDoodle API credentials in your `.env` file.

## 🆘 Troubleshooting

### Common Issues

1. **WebSocket connection errors**
   - Ensure backend is running on port 1600
   - Check firewall settings
   - Verify CORS configuration

2. **AI Assistant not working**
   - Check OpenAI API key in `.env`
   - Verify API credits
   - Check browser console for errors

3. **Code execution failing**
   - Verify code syntax
   - Check selected language matches code
   - Ensure Piston API is accessible

4. **Tracking Prevention warnings**
   - These are browser security warnings for Monaco Editor CDN
   - They don't affect functionality
   - Can be ignored or configure Monaco to use local files

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License.

## 🎉 Acknowledgments

- [shadcn/ui](https://ui.shadcn.com/) for the beautiful UI components
- [Monaco Editor](https://microsoft.github.io/monaco-editor/) for the code editor
- [Yjs](https://yjs.dev/) for CRDT-based collaboration
- [Piston](https://github.com/engineer-man/piston) for code execution
- [OpenAI](https://openai.com/) for AI assistance
- [Socket.IO](https://socket.io/) for real-time communication

---

**Happy Coding! 🚀**
