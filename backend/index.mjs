
// backend/index.mjs
import express from "express";
import http from "http";
import { Server } from "socket.io";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import cors from "cors";
import dotenv from "dotenv";
import { GoogleGenerativeAI } from "@google/generative-ai";
import axios from "axios";
import { spawn } from "node:child_process";
import User from "./models/user.js";
import Room from "./models/room.js";

dotenv.config();
const MAX_ROOM_MEMBERS = Number(process.env.MAX_ROOM_MEMBERS || 4);

const app = express();
const server = http.createServer(app);
// --- Yjs WebSocket server for collaborative editing ---
import { WebSocketServer } from "ws";
import { setupWSConnection } from "y-websocket/bin/utils";
const yjsWss = new WebSocketServer({ noServer: true });
server.on("upgrade", (request, socket, head) => {
  if (!request.url?.startsWith("/yjs")) return;
  yjsWss.handleUpgrade(request, socket, head, (ws) => {
    yjsWss.emit("connection", ws, request);
  });
});
yjsWss.on("connection", (ws, req) => {
  setupWSConnection(ws, req);
});
const io = new Server(server, {
  cors: { origin: ["http://localhost:5173"], credentials: true }
});
app.use(express.json());
app.use(cors({ origin: ["http://localhost:5173"], credentials: true }));

// MongoDB connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB Connected"))
  .catch(err => console.error("❌ MongoDB Error:", err));

// JWT Middleware
function authenticate(req, res, next) {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Unauthorized - No token provided" });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({ error: "Session expired. Please login again." });
    }
    res.status(403).json({ error: "Invalid token" });
  }
}

// ---------- HEALTH CHECK ----------
app.get("/api/health", (req, res) => {
  res.json({ status: "OK", message: "Server is running", timestamp: new Date().toISOString() });
});

// ---------- AUTH ROUTES ----------
app.post("/api/auth/register", async (req, res) => {
  try {
    const { email, username, password } = req.body;
    
    if (!email || !username || !password) {
      return res.status(400).json({ error: "All fields are required" });
    }
    
    const exists = await User.findOne({ $or: [{ email }, { username }] });
    if (exists) return res.status(400).json({ error: "User already exists" });
    
    const hashed = await bcrypt.hash(password, 10);
    const newUser = await new User({ email, username, password: hashed, isLoggedIn: true }).save();
    
    // Generate token so user is auto-logged-in after registration
    const token = jwt.sign({ id: newUser._id, email: newUser.email }, process.env.JWT_SECRET, { expiresIn: "7d" });
    
    console.log(`✅ New user registered: ${username} (${email})`);
    res.json({ token, username: newUser.username, userId: newUser._id });
  } catch (error) {
    console.error("❌ Registration error:", error);
    res.status(500).json({ error: "Registration failed" });
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }
    
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ error: "Invalid credentials" });
    
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(400).json({ error: "Invalid credentials" });
    
    const token = jwt.sign({ id: user._id, email: user.email }, process.env.JWT_SECRET, { expiresIn: "7d" });
    
    // Update login status and clear any previous room associations
    user.isLoggedIn = true;
    await user.save();
    
    console.log(`✅ User logged in: ${user.username} (${email})`);
    res.json({ token, username: user.username, userId: user._id });
  } catch (error) {
    console.error("❌ Login error:", error);
    res.status(500).json({ error: "Login failed" });
  }
});

// Logout route
app.post("/api/auth/logout", authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (user) {
      user.isLoggedIn = false;
      await user.save();
      console.log(`👋 User logged out: ${user.username} (${user.email})`);
    }
    res.json({ message: "Logged out" });
  } catch (err) {
    console.error("❌ Logout error:", err);
    res.status(500).json({ error: "Logout failed" });
  }
});

// ---------- ROOM JOIN LIMIT ----------
app.post("/api/rooms/join", authenticate, async (req, res) => {
  try {
    const { roomId } = req.body;
    
    // Validate room ID
    if (!roomId || typeof roomId !== 'string') {
      return res.status(400).json({ error: "Valid room ID is required" });
    }
    
    const trimmedRoomId = roomId.trim();
    
    if (trimmedRoomId.length === 0) {
      return res.status(400).json({ error: "Room ID cannot be empty" });
    }
    
    if (!/^[a-zA-Z0-9-]+$/.test(trimmedRoomId)) {
      return res.status(400).json({ error: "Room ID can only contain letters, numbers, and hyphens" });
    }
    
    let room = await Room.findOne({ roomId: trimmedRoomId });
    
    if (!room) {
      room = await new Room({ roomId: trimmedRoomId, users: [req.user.email] }).save();
      console.log(`✅ New room created: ${trimmedRoomId} by ${req.user.email}`);
      return res.json({ joined: true, paymentRequired: false, memberCount: room.users.length });
    }
    
    const isExistingMember = room.users.includes(req.user.email);
    
    if (!isExistingMember && room.users.length >= MAX_ROOM_MEMBERS) {
      return res.status(403).json({
        joined: false,
        error: `Room is full. Maximum ${MAX_ROOM_MEMBERS} members allowed.`
      });
    }
    
    if (!isExistingMember) {
      room.users.push(req.user.email);
      await room.save();
      console.log(`✅ User ${req.user.email} joined room: ${trimmedRoomId}`);
    }
    
    res.json({ joined: true, paymentRequired: false, memberCount: room.users.length });
  } catch (error) {
    console.error("❌ Room join error:", error);
    res.status(500).json({ error: "Failed to join room. Please try again." });
  }
});

// ---------- AI EXPLAIN ----------
app.post("/api/ai-explain", authenticate, async (req, res) => {
  const { code, question } = req.body;
  const prompt = question ? `Explain: ${code}\nQuestion: ${question}` : `Explain: ${code}`;
  try {
    const provider = (process.env.AI_PROVIDER || "gemini").toLowerCase();

    if (provider === "nvidia") {
      const model = process.env.NVIDIA_MODEL_ID;
      const apiKey = process.env.NVIDIA_API_KEY;
      if (!model || !apiKey) {
        return res.status(500).json({ error: "NVIDIA AI configuration missing in .env" });
      }

      const response = await axios.post(
        "https://integrate.api.nvidia.com/v1/chat/completions",
        {
          model,
          messages: [{ role: "user", content: prompt }],
          temperature: 0.2,
          max_tokens: 700
        },
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json"
          }
        }
      );

      const answer = response.data?.choices?.[0]?.message?.content || "No response";
      return res.json({ answer });
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent(prompt);
    res.json({ answer: result.response.text() });
  } catch (err) {
    const providerStatus = err?.response?.status;
    const providerData = err?.response?.data;
    const providerError =
      typeof providerData === "string"
        ? providerData
        : providerData
          ? JSON.stringify(providerData)
          : err.message;

    if ((process.env.AI_PROVIDER || "").toLowerCase() === "nvidia" && providerStatus === 401) {
      return res.status(502).json({
        error: `NVIDIA authentication failed (401). Check NVIDIA_API_KEY and NVIDIA_MODEL_ID. Details: ${providerError}`
      });
    }

    res.status(500).json({ error: providerError || err.message });
  }
});

// ---------- SOCKET.IO ----------
const rooms = new Map();
const roomCodes = new Map();

io.on("connection", (socket) => {
  console.log(`🔌 User connected: ${socket.id}`);

  socket.on("join", async ({ roomId, userName, userEmail }) => {
    try {
      // Validate input
      if (!roomId || !userName) {
        socket.emit("error", { message: "Room ID and username are required" });
        return;
      }

      let room = await Room.findOne({ roomId });
      const memberId = userEmail || userName || socket.id;
      
      if (!room) {
        room = await new Room({ roomId, users: [memberId] }).save();
      } else {
        const isExistingMember = room.users.includes(memberId);
        if (!isExistingMember && room.users.length >= MAX_ROOM_MEMBERS) {
          socket.emit("roomFull", {
            roomId,
            message: `Room is full. Maximum ${MAX_ROOM_MEMBERS} members allowed.`
          });
          return;
        }
        if (!isExistingMember) {
          room.users.push(memberId);
          await room.save();
        }
      }

      socket.join(roomId);
      if (!rooms.has(roomId)) rooms.set(roomId, new Set());
      rooms.get(roomId).add(userName);
      
      console.log(`✅ ${userName} joined room: ${roomId}, all users:`, Array.from(rooms.get(roomId)));
      
      // Emit to all users in room including the joiner
      io.to(roomId).emit("userJoined", Array.from(rooms.get(roomId)));
      
      // Send current code to the new joiner
      socket.emit("codeUpdate", roomCodes.get(roomId) || "// start coding...");
      
      // Confirm successful join to the user
      socket.emit("joinedRoom", { roomId, userName, userEmail });
      
      // Store user info for cleanup
      socket.roomId = roomId;
      socket.userName = userName;
      socket.userEmail = userEmail;
      
      // Send periodic user list updates to keep everyone in sync
      const syncInterval = setInterval(() => {
        if (socket.roomId && rooms.has(socket.roomId)) {
          io.to(socket.roomId).emit("userJoined", Array.from(rooms.get(socket.roomId)));
        }
      }, 5000); // Sync every 5 seconds
      
      socket.syncInterval = syncInterval;
      
    } catch (error) {
      console.error("❌ Join room error:", error);
      socket.emit("error", { message: "Failed to join room. Please try again." });
    }
  });

  socket.on("codeChange", ({ roomId, code }) => {
    roomCodes.set(roomId, code);
    socket.to(roomId).emit("codeUpdate", code);
  });

  socket.on("typing", ({ roomId, userName }) => {
    if (!roomId || !userName) return;
    // socket.to() sends to everyone in room EXCEPT the sender
    // This is the key fix — sender must NEVER receive their own typing event
    console.log(`⌨️  Received typing from: "${userName}" in room ${roomId}, broadcasting to others`);
    socket.to(roomId).emit("userTyping", userName);
  });

  socket.on("stopTyping", ({ roomId, userName }) => {
    if (!roomId || !userName) return;
    console.log(`⌨️  Received stopTyping from: "${userName}" in room ${roomId}, broadcasting to others`);
    socket.to(roomId).emit("userStoppedTyping", userName);
  });

  socket.on("languageChange", ({ roomId, language }) => {
    if (!roomId || !language) return;
    // io.to() sends to ALL users in room including sender
    // so the person who changed language also sees their own change reflected
    io.to(roomId).emit("languageUpdate", language);
    console.log(`🔤 Language changed to ${language} in room ${roomId}`);
  });

  socket.on("compilecode", async ({ code, roomId, language, version, input }) => {
    try {
      console.log(`🔄 Executing ${language} code in room: ${roomId}`);
      
      // Validate inputs
      if (!code || typeof code !== 'string') {
        throw new Error("Invalid code provided");
      }
      
      if (!language || typeof language !== 'string') {
        throw new Error("Invalid language specified");
      }
      
      // For JavaScript, use local Node.js execution
      if (language === "javascript") {
        try {
          const local = await executeJavascriptLocally(code, input || "");
          const result = {
            run: {
              output: local.stdout || local.stderr || "No output",
              stderr: local.stderr || "",
              code: local.exitCode
            }
          };
          io.to(roomId).emit("codeResponse", result);
          console.log(`✅ JavaScript execution completed for room: ${roomId}`);
          return;
        } catch (localError) {
          console.error("❌ Local JS execution error:", localError.message);
          const errorResult = {
            run: {
              output: `Execution Error: ${localError.message}`,
              stderr: localError.message,
              code: 1
            }
          };
          io.to(roomId).emit("codeResponse", errorResult);
          return;
        }
      }

      // For other languages, try JDoodle API as alternative
      const languageMap = {
        python: { language: "python3", versionIndex: "4" },
        java: { language: "java", versionIndex: "4" },
        cpp: { language: "cpp17", versionIndex: "5" }
      };

      const jdoodleConfig = languageMap[language];
      
      if (!jdoodleConfig) {
        throw new Error(`Language ${language} is not supported. Only JavaScript, Python, Java, and C++ are available.`);
      }

      // Using JDoodle free API (limited to 200 requests/day)
      const response = await axios.post("https://api.jdoodle.com/v1/execute", {
        clientId: process.env.JDOODLE_CLIENT_ID || "your_client_id",
        clientSecret: process.env.JDOODLE_CLIENT_SECRET || "your_client_secret",
        script: code,
        language: jdoodleConfig.language,
        versionIndex: jdoodleConfig.versionIndex,
        stdin: input || ""
      }, {
        timeout: 10000
      });

      const result = {
        run: {
          output: response.data.output || "No output",
          stderr: response.data.error || "",
          code: response.data.statusCode || 0
        }
      };

      io.to(roomId).emit("codeResponse", result);
      console.log(`✅ Code execution completed for room: ${roomId}`);
      
    } catch (error) {
      const statusCode = error?.response?.status;
      const apiErrorData = error?.response?.data;
      const apiErrorText =
        typeof apiErrorData === "string"
          ? apiErrorData
          : apiErrorData
            ? JSON.stringify(apiErrorData)
            : "";
      const detailedMessage = statusCode
        ? `Execution API failed (${statusCode}). ${apiErrorText || error.message}`
        : `Execution Error: ${error.message}`;

      console.error("❌ Code execution error:", detailedMessage);
      const errorResult = {
        run: {
          output: `⚠️ Code Execution Error\n\n${detailedMessage}\n\nNote: For Python, Java, and C++, you need to configure JDoodle API credentials in your .env file:\nJDOODLE_CLIENT_ID=your_client_id\nJDOODLE_CLIENT_SECRET=your_client_secret\n\nGet free API credentials at: https://www.jdoodle.com/compiler-api`,
          stderr: detailedMessage,
          code: 1
        }
      };
      io.to(roomId).emit("codeResponse", errorResult);
    }
  });

  socket.on("leaveRoom", async () => {
    if (socket.roomId && socket.userName) {
      const roomUsers = rooms.get(socket.roomId);
      if (roomUsers) {
        roomUsers.delete(socket.userName);
        
        // Broadcast updated user list to remaining users
        io.to(socket.roomId).emit("userJoined", Array.from(roomUsers));
        console.log(`👋 ${socket.userName} left room: ${socket.roomId}, remaining users:`, Array.from(roomUsers));
        
        // Clean up empty rooms
        if (roomUsers.size === 0) {
          rooms.delete(socket.roomId);
          roomCodes.delete(socket.roomId);
          console.log(`🗑️ Cleaned up empty room: ${socket.roomId}`);
        }
      }
      socket.leave(socket.roomId);
    }
    
    if (socket.roomId) {
      const memberId = socket.userEmail || socket.userName || socket.id;
      try {
        const room = await Room.findOne({ roomId: socket.roomId });
        if (room) {
          room.users = room.users.filter((user) => user !== memberId);
          
          // Delete room from DB if no users left
          if (room.users.length === 0) {
            await Room.deleteOne({ roomId: socket.roomId });
            console.log(`🗑️ Deleted empty room from DB: ${socket.roomId}`);
          } else {
            await room.save();
          }
        }
      } catch (err) {
        console.error("❌ Leave room DB update error:", err.message);
      }
    }
  });

  socket.on("disconnect", async () => {
    console.log(`🔌 User disconnected: ${socket.id}`);
    
    // Clear sync interval
    if (socket.syncInterval) {
      clearInterval(socket.syncInterval);
    }
    
    if (socket.roomId && socket.userName) {
      const roomUsers = rooms.get(socket.roomId);
      if (roomUsers) {
        roomUsers.delete(socket.userName);
        
        // Broadcast BEFORE leaving the room so others get the update
        io.to(socket.roomId).emit("userJoined", Array.from(roomUsers));
        console.log(`👋 ${socket.userName} disconnected from room: ${socket.roomId}, remaining users:`, Array.from(roomUsers));
        
        // Clean up empty rooms
        if (roomUsers.size === 0) {
          rooms.delete(socket.roomId);
          roomCodes.delete(socket.roomId);
          console.log(`🗑️ Cleaned up empty room on disconnect: ${socket.roomId}`);
        }
      }
    }
    
    if (socket.roomId) {
      const memberId = socket.userEmail || socket.userName || socket.id;
      try {
        const room = await Room.findOne({ roomId: socket.roomId });
        if (room) {
          room.users = room.users.filter((user) => user !== memberId);
          
          // Delete room from DB if no users left
          if (room.users.length === 0) {
            await Room.deleteOne({ roomId: socket.roomId });
            console.log(`🗑️ Deleted empty room from DB on disconnect: ${socket.roomId}`);
          } else {
            await room.save();
          }
        }
      } catch (err) {
        console.error("❌ Disconnect DB update error:", err.message);
      }
    }
  });
});

function executeJavascriptLocally(code, stdinText = "") {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ["-e", code], {
      stdio: ["pipe", "pipe", "pipe"]
    });

    let stdout = "";
    let stderr = "";
    let finished = false;

    const timeout = setTimeout(() => {
      if (finished) return;
      finished = true;
      child.kill("SIGKILL");
      reject(new Error("Local execution timed out after 3s"));
    }, 3000);

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", (err) => {
      if (finished) return;
      finished = true;
      clearTimeout(timeout);
      reject(err);
    });

    child.on("close", (exitCode) => {
      if (finished) return;
      finished = true;
      clearTimeout(timeout);
      resolve({ stdout, stderr, exitCode: exitCode ?? 1 });
    });

    child.stdin.write(stdinText);
    child.stdin.end();
  });
}

server.listen(1600, () => console.log(`🚀 Server running on 1600`));







