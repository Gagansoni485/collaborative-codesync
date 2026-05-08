// frontend/src/pages/EditorPage.tsx
import { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import Editor from "@monaco-editor/react";
import io from "socket.io-client";
import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";
import { MonacoBinding } from "y-monaco";
import stringToColor from "string-to-color";
import { v4 as uuid } from "uuid";
import axios from "axios";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Code2, Play, Users, Copy, LogOut, Terminal, X } from "lucide-react";

const SOCKET_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:1600";

// ── Socket created ONCE outside component — never re-instantiated on re-render ──
const socket = io(SOCKET_URL, { autoConnect: true });

// ── Axios interceptor — handle token expiry globally ────────────────────────
axios.interceptors.response.use(
  (res) => res,
  (error) => {
    const status = error?.response?.status;
    const msg    = error?.response?.data?.error ?? "";
    if ((status === 401 || status === 403) &&
        (msg.includes("expired") || msg.includes("Invalid token"))) {
      localStorage.clear();
      window.location.href = "/login";
      toast.error("Session expired. Please login again.");
    }
    return Promise.reject(error);
  }
);

// ────────────────────────────────────────────────────────────────────────────
const EditorPage = () => {
  const navigate = useNavigate();

  // ── State ──────────────────────────────────────────────────────────────────
  const [user,        setUser]        = useState<any>(null);
  const [joined,      setJoined]      = useState(false);
  const [roomId,      setRoomId]      = useState("");
  const [userName,    setUserName]    = useState("");
  const [users,       setUsers]       = useState<string[]>([]);
  const [language,    setLanguage]    = useState("javascript");
  const [output,      setOutput]      = useState("");
  const [userInput,   setUserInput]   = useState("");
  
  // Mobile menu states
  const [showSidebar, setShowSidebar] = useState(false);
  const [showConsole, setShowConsole] = useState(true);
  const [aiResponse,  setAiResponse]  = useState("");
  const [aiQuestion,  setAiQuestion]  = useState("");
  const [aiLoading,   setAiLoading]   = useState(false);

  // FIX: typing stored as Map<name, timer> — prevents self-display, auto-clears per user
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const typingTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  // FIX: refs hold latest values so socket callbacks never close over stale state
  const userNameRef   = useRef("");
  const roomIdRef     = useRef("");
  const joinedRef     = useRef(false);

  // Yjs refs
  const providerRef   = useRef<WebsocketProvider | null>(null);
  const ydocRef       = useRef<Y.Doc | null>(null);
  const bindingRef    = useRef<MonacoBinding | null>(null);
  const editorRef     = useRef<any>(null);
  const editorReady   = useRef(false);

  // Typing debounce
  const typingDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Restore session on mount ───────────────────────────────────────────────
  useEffect(() => {
    const token    = localStorage.getItem("token");
    const userData = localStorage.getItem("user");
    if (!token || !userData) { navigate("/login"); return; }

    const parsed = JSON.parse(userData);
    setUser(parsed);

    const savedRoom   = localStorage.getItem("currentRoomId");
    const savedName   = localStorage.getItem("currentUserName");
    const savedEmail  = localStorage.getItem("currentUserEmail");
    const wasJoined   = localStorage.getItem("currentJoined");

    if (savedRoom && savedName && wasJoined === "true" && savedEmail === parsed.email) {
      setRoomId(savedRoom);
      setUserName(savedName);
      userNameRef.current = savedName;
      roomIdRef.current   = savedRoom;
      socket.emit("join", { roomId: savedRoom, userName: savedName, userEmail: parsed.email });
    } else {
      ["currentRoomId","currentUserName","currentUserEmail","currentJoined"]
        .forEach((k) => localStorage.removeItem(k));
    }
  }, [navigate]);

  // ── Keep refs in sync with state ───────────────────────────────────────────
  // FIX: This ensures socket callbacks always read the latest userName/roomId
  useEffect(() => {
    userNameRef.current = userName;
  }, [userName]);

  useEffect(() => {
    roomIdRef.current = roomId;
  }, [roomId]);

  useEffect(() => {
    joinedRef.current = joined;
  }, [joined]);

  // ── Socket listeners ───────────────────────────────────────────────────────
  useEffect(() => {
    socket.on("connect_error", () =>
      toast.error("Connection error. Make sure the server is running on port 1600.")
    );

    socket.on("userJoined", (list: string[]) => setUsers(list));

    // FIX: language update — update dropdown for everyone including sender
    socket.on("languageUpdate", (lang: string) => setLanguage(lang));

    // FIX: codeUpdate only used for initial snapshot before Yjs binds.
    // Yjs handles all subsequent sync — we intentionally ignore this event
    // to prevent the double-sync garbled-text bug.
    socket.on("codeUpdate", (_code: string) => { /* Yjs handles sync */ });

    // FIX: typing — uses per-user timers, never shows self
    socket.on("userTyping", (name: string) => {
      console.log("📥 Received userTyping:", name, "| My name:", userNameRef.current);
      if (name === userNameRef.current) return;
      setTypingUsers((prev) => new Set(prev).add(name));

      if (typingTimers.current.has(name)) clearTimeout(typingTimers.current.get(name)!);
      const t = setTimeout(() => {
        setTypingUsers((prev) => { const s = new Set(prev); s.delete(name); return s; });
        typingTimers.current.delete(name);
      }, 2500);
      typingTimers.current.set(name, t);
    });

    socket.on("userStoppedTyping", (name: string) => {
      console.log("📥 Received userStoppedTyping:", name, "| My name:", userNameRef.current);
      if (name === userNameRef.current) return;
      setTypingUsers((prev) => { const s = new Set(prev); s.delete(name); return s; });
      if (typingTimers.current.has(name)) {
        clearTimeout(typingTimers.current.get(name)!);
        typingTimers.current.delete(name);
      }
    });

    socket.on("codeResponse", (res: any) => setOutput(res.run?.output ?? ""));

    socket.on("joinedRoom", (data: any) => {
      setJoined(true);
      joinedRef.current = true;
      localStorage.setItem("currentRoomId",    data.roomId);
      localStorage.setItem("currentUserName",  userNameRef.current);
      localStorage.setItem("currentUserEmail", data.userEmail ?? "");
      localStorage.setItem("currentJoined",    "true");
      toast.success(`Joined room: ${data.roomId}`);
    });

    socket.on("roomFull",  (p: any) => { toast.error(p?.message ?? "Room is full."); setJoined(false); });
    socket.on("error",     (e: any) => toast.error(e?.message ?? "Socket error"));

    return () => {
      socket.off("connect_error");
      socket.off("userJoined");
      socket.off("languageUpdate");
      socket.off("codeUpdate");
      socket.off("userTyping");
      socket.off("userStoppedTyping");
      socket.off("codeResponse");
      socket.off("joinedRoom");
      socket.off("roomFull");
      socket.off("error");
      typingTimers.current.forEach(clearTimeout);
      typingTimers.current.clear();
    };
  }, []);

  // Emit leaveRoom on browser close/refresh
  useEffect(() => {
    const onUnload = () => socket.emit("leaveRoom");
    window.addEventListener("beforeunload", onUnload);
    return () => window.removeEventListener("beforeunload", onUnload);
  }, []);

  // ── Yjs setup ──────────────────────────────────────────────────────────────
  // FIX: only runs when BOTH joined=true AND editor is mounted.
  // providerRef guard ensures we never create a second provider on re-render.
  const initYjs = useCallback(() => {
    if (providerRef.current || !editorRef.current || !joinedRef.current) return;

    const roomId   = roomIdRef.current;
    const uName    = userNameRef.current;

    const ydoc     = new Y.Doc();
    const provider = new WebsocketProvider("ws://localhost:1600/yjs", roomId, ydoc);

    provider.awareness.setLocalStateField("user", {
      name:  uName,
      color: stringToColor(uName),
    });

    const ytext   = ydoc.getText("monaco");
    const model   = editorRef.current.getModel();
    const binding = new MonacoBinding(ytext, model, new Set([editorRef.current]), provider.awareness);

    ydocRef.current    = ydoc;
    providerRef.current = provider;
    bindingRef.current  = binding;
  }, []);

  useEffect(() => {
    if (joined && editorReady.current) initYjs();
  }, [joined, initYjs]);

  // ── Destroy Yjs ────────────────────────────────────────────────────────────
  const destroyYjs = useCallback(() => {
    bindingRef.current?.destroy();
    providerRef.current?.destroy();
    bindingRef.current  = null;
    providerRef.current = null;
    ydocRef.current     = null;
  }, []);

  // ── Auth actions ───────────────────────────────────────────────────────────
  const handleLogout = async () => {
    try {
      const token = localStorage.getItem("token");
      if (token)
        await axios.post(`${SOCKET_URL}/api/auth/logout`, {}, {
          headers: { Authorization: `Bearer ${token}` },
        });
    } catch {}
    destroyYjs();
    socket.emit("leaveRoom");
    localStorage.clear();
    navigate("/login");
    toast.success("Logged out successfully");
  };

  // ── Join room ──────────────────────────────────────────────────────────────
  const joinRoom = async () => {
    const trimRoom = roomId.trim();
    const trimName = userName.trim();

    if (!trimRoom || !trimName)
      return toast.error("Please enter a Room ID and display name.");
    if (!/^[a-zA-Z0-9-]+$/.test(trimRoom))
      return toast.error("Room ID can only contain letters, numbers, and hyphens.");
    if (trimName.length < 2 || trimName.length > 30)
      return toast.error("Display name must be 2–30 characters.");

    try {
      const token = localStorage.getItem("token");
      if (!token) { toast.error("Session expired."); navigate("/login"); return; }

      const res = await axios.post(
        `${SOCKET_URL}/api/rooms/join`,
        { roomId: trimRoom },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.data.joined) {
        // FIX: update refs BEFORE emitting so socket handler sees correct values
        userNameRef.current = trimName;
        roomIdRef.current   = trimRoom;
        setUserName(trimName);
        socket.emit("join", { roomId: trimRoom, userName: trimName, userEmail: user?.email });
      }
    } catch (err: any) {
      const status = err?.response?.status;
      if (status === 401 || status === 403) {
        toast.error("Session expired.");
        localStorage.clear();
        navigate("/login");
        return;
      }
      toast.error(err?.response?.data?.error ?? "Failed to join room");
    }
  };

  // ── Leave room ─────────────────────────────────────────────────────────────
  const leaveRoom = () => {
    destroyYjs();
    socket.emit("leaveRoom");
    setJoined(false);
    joinedRef.current   = false;
    editorReady.current = false;
    setRoomId("");
    setUserName("");
    userNameRef.current = "";
    roomIdRef.current   = "";
    setUsers([]);
    setOutput("");
    setUserInput("");
    setTypingUsers(new Set());
    ["currentRoomId","currentUserName","currentUserEmail","currentJoined"]
      .forEach((k) => localStorage.removeItem(k));
    toast.info("You left the room.");
  };

  const copyRoomId = () => {
    navigator.clipboard.writeText(roomId);
    toast.success("Room ID copied!");
  };

  // ── Language change ────────────────────────────────────────────────────────
  // FIX: update local state immediately + emit to server
  const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const lang = e.target.value;
    setLanguage(lang);
    socket.emit("languageChange", { roomId: roomIdRef.current, language: lang });
  };

  // ── Run code ───────────────────────────────────────────────────────────────
  const runCode = () => {
    // FIX: always get code from Monaco model (Yjs source of truth), not React state
    const currentCode = editorRef.current?.getValue() ?? "";
    socket.emit("compilecode", {
      code:    currentCode,
      roomId:  roomIdRef.current,
      language,
      version: "*",
      input:   userInput,
    });
  };

  // ── AI ask ─────────────────────────────────────────────────────────────────
  const handleAskAI = async () => {
    if (!aiQuestion.trim()) return;
    setAiLoading(true);
    setAiResponse("");
    try {
      const token = localStorage.getItem("token");
      if (!token) { navigate("/login"); return; }
      const currentCode = editorRef.current?.getValue() ?? "";
      const res = await axios.post(
        `${SOCKET_URL}/api/ai-explain`,
        { code: currentCode, question: aiQuestion },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setAiResponse(res.data.answer ?? "AI didn't return an answer.");
    } catch (err: any) {
      if (err?.response?.status === 401 || err?.response?.status === 403) {
        localStorage.clear(); navigate("/login"); return;
      }
      setAiResponse(err?.response?.data?.error ?? "Something went wrong.");
      toast.error("AI request failed.");
    } finally {
      setAiLoading(false);
    }
  };

  // ── Typing label ───────────────────────────────────────────────────────────
  const typingLabel = (() => {
    const names = Array.from(typingUsers);
    if (!names.length)   return "";
    if (names.length === 1) return `${names[0]} is typing...`;
    if (names.length === 2) return `${names[0]} and ${names[1]} are typing...`;
    return "Several people are typing...";
  })();

  // ══════════════════════════════════════════════════════════════════════════
  //  PRE-JOIN SCREEN
  // ══════════════════════════════════════════════════════════════════════════
  if (!joined) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="w-full max-w-md space-y-6">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
              <Code2 className="w-5 h-5 text-primary" />
            </div>
            <span className="text-xl font-semibold text-foreground">CodeSync</span>
          </div>

          <div>
            <h2 className="text-2xl font-bold text-foreground">
              Welcome, {user?.username ?? user?.email}!
            </h2>
            <p className="text-muted-foreground mt-1">Enter a room to start collaborating</p>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Room ID</label>
              <Input
                placeholder="Enter room ID"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && joinRoom()}
                className="bg-card border-border focus:border-primary/50 h-11"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Your Display Name</label>
              <Input
                placeholder="Enter your name"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && joinRoom()}
                className="bg-card border-border focus:border-primary/50 h-11"
              />
            </div>

            <Button onClick={joinRoom} className="w-full h-11">Join Room</Button>

            <Button
              variant="outline"
              className="w-full h-11 bg-card border-border hover:border-primary/30"
              onClick={() => { setRoomId(uuid()); toast.success("Room ID generated!"); }}
            >
              Generate New Room
            </Button>

            <Button variant="ghost" className="w-full h-11" onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-2" />Logout
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  EDITOR SCREEN
  // ══════════════════════════════════════════════════════════════════════════
  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">

      {/* ── Top Bar (Responsive) ────────────────────────────────────────── */}
      <header className="h-14 border-b border-border flex items-center justify-between px-4 md:px-6 bg-card/50 backdrop-blur-sm shrink-0">
        {/* Left side */}
        <div className="flex items-center gap-2 md:gap-4">
          {/* Mobile sidebar toggle */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowSidebar(!showSidebar)}
            className="md:hidden h-8 w-8 p-0"
            title="Toggle Sidebar"
          >
            <Users className="w-4 h-4" />
          </Button>
          
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
              <Code2 className="w-4 h-4 text-primary" />
            </div>
            <span className="font-semibold text-foreground hidden sm:inline">CodeSync</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 hidden md:inline">v2.0</span>
          </div>
          
          {/* Room info - hidden on small screens */}
          <div className="hidden md:flex items-center gap-2">
            <div className="h-6 w-px bg-border" />
            <span className="text-sm text-muted-foreground">Room:</span>
            <span className="text-sm font-mono text-foreground">{roomId.slice(0,8)}...</span>
            <span className="text-xs px-2 py-1 rounded-full bg-success/10 text-success border border-success/20 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />Live
            </span>
          </div>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2">
          {/* User count - always visible */}
          <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-secondary/50 text-xs text-muted-foreground">
            <Users className="w-3 h-3 md:w-4 md:h-4" />
            <span className="hidden sm:inline">{users.length}</span>
          </div>
          
          {/* Desktop buttons */}
          <Button variant="outline" size="sm" onClick={copyRoomId} className="hidden md:flex h-9">
            <Copy className="w-4 h-4 mr-2" />Copy ID
          </Button>
          <Button variant="outline" size="sm" onClick={leaveRoom} className="hidden sm:flex h-9">
            Leave
          </Button>
          <Button variant="ghost" size="sm" onClick={handleLogout} className="h-8 md:h-9">
            <LogOut className="w-4 h-4 md:mr-2" />
            <span className="hidden md:inline">Logout</span>
          </Button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden relative">

        {/* ── Sidebar (Responsive with overlay) ──────────────────────────── */}
        {/* Mobile overlay */}
        {showSidebar && (
          <div 
            className="fixed inset-0 bg-black/50 z-40 md:hidden"
            onClick={() => setShowSidebar(false)}
          />
        )}
        
        {/* Sidebar */}
        <aside className={`
          fixed md:relative
          inset-y-0 left-0
          w-64 bg-card border-r border-border 
          flex flex-col shrink-0
          z-50
          transform transition-transform duration-300 ease-in-out
          ${showSidebar ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}>
          {/* Mobile close button */}
          <div className="md:hidden flex items-center justify-between p-4 border-b border-border">
            <span className="font-semibold">Menu</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowSidebar(false)}
              className="h-8 w-8 p-0"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
          
          <div className="p-4 border-b border-border">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Language</h3>
            {/* FIX: controlled by `language` state — updates when server broadcasts languageUpdate */}
            <select
              value={language}
              onChange={handleLanguageChange}
              className="w-full h-10 px-3 rounded-lg bg-background border border-border text-sm text-foreground focus:border-primary/50 focus:outline-none transition-colors"
            >
              <option value="javascript">JavaScript</option>
              <option value="python">Python</option>
              <option value="java">Java</option>
              <option value="cpp">C++</option>
            </select>
          </div>

          <div className="flex-1 p-4 overflow-y-auto">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Collaborators
            </h3>
            <div className="space-y-2">
              {users.map((u, i) => (
                <div key={i} className="flex items-center gap-3 p-2 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                    style={{ backgroundColor: stringToColor(u) }}
                  >
                    {u.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-sm text-foreground flex-1 truncate">{u}</span>
                  <span className="w-2 h-2 rounded-full bg-success shrink-0" />
                </div>
              ))}
            </div>

            {/* FIX: derived from Set — never shows self, auto-clears per-user */}
            {typingLabel && (
              <p className="text-xs text-muted-foreground italic mt-4 px-1 animate-pulse">
                {typingLabel}
              </p>
            )}
          </div>
        </aside>

        {/* ── Main area ───────────────────────────────────────────────────── */}
        <div className="flex-1 flex overflow-hidden">

          {/* Monaco Editor */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <Editor
              height="100%"
              language={language}
              theme="vs-dark"
              options={{
                minimap:              { enabled: false },
                fontSize:             14,
                lineNumbers:          "on",
                scrollBeyondLastLine: false,
                automaticLayout:      true,
                wordWrap:             "on",
              }}
              onMount={(editor) => {
                editorRef.current   = editor;
                editorReady.current = true;
                
                // Track if user is actively typing (has focus and cursor moved)
                let isUserTyping = false;
                
                // Detect when user is actively editing
                editor.onDidChangeCursorPosition((e) => {
                  // If cursor moved due to user action (not programmatic)
                  if (e.source === 'keyboard' || e.source === 'mouse') {
                    isUserTyping = true;
                  }
                });
                
                // Listen for content changes
                editor.onDidChangeModelContent((e) => {
                  if (!joinedRef.current) return;
                  
                  // Only emit typing if:
                  // 1. User is actively typing (cursor moved by keyboard/mouse)
                  // 2. Editor has focus
                  // 3. Change is not undo/redo
                  const hasFocus = editor.hasTextFocus();
                  
                  if (isUserTyping && hasFocus && !e.isUndoing && !e.isRedoing) {
                    if (typingDebounce.current) clearTimeout(typingDebounce.current);
                    console.log("🔤 LOCAL change detected, sending typing event with userName:", userNameRef.current);
                    socket.emit("typing", { roomId: roomIdRef.current, userName: userNameRef.current });
                    
                    typingDebounce.current = setTimeout(() => {
                      console.log("🔤 Sending stopTyping event with userName:", userNameRef.current);
                      socket.emit("stopTyping", { roomId: roomIdRef.current, userName: userNameRef.current });
                      isUserTyping = false;
                    }, 1000);
                  }
                });
                
                // Reset typing flag when editor loses focus
                editor.onDidBlurEditorText(() => {
                  isUserTyping = false;
                });
                
                // Trigger Yjs init now that editor is ready
                if (joinedRef.current) initYjs();
              }}
            />
          </div>

          {/* ── Right panel (Console + AI) - Responsive ────────────────────── */}
          {/* Mobile: Full screen overlay, Desktop: Side panel */}
          {showConsole && (
            <>
              {/* Mobile overlay backdrop */}
              <div 
                className="fixed inset-0 bg-black/50 z-40 md:hidden"
                onClick={() => setShowConsole(false)}
              />
              
              {/* Console panel */}
              <div className={`
                fixed md:relative
                inset-0 md:inset-auto
                w-full md:w-[30rem]
                flex flex-col
                bg-gradient-to-b from-card to-card/95 
                border-l-2 border-primary/20 shadow-2xl
                z-50 md:z-auto
                overflow-hidden
              `}>
            {/* Console section */}
            <div className="h-[22rem] shrink-0 flex flex-col border-b-2 border-primary/10">
              <div className="h-12 flex items-center justify-between px-5 border-b border-border/50 bg-gradient-to-r from-secondary/40 to-secondary/20 shrink-0">
                <span className="text-sm font-bold text-foreground flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Terminal className="w-4 h-4 text-primary" />
                  </div>
                  Code Execution
                </span>
                <span className="text-xs px-2 py-1 rounded-full bg-success/10 text-success border border-success/20">
                  Ready
                </span>
              </div>

              <div className="flex-1 flex flex-col p-4 gap-3 overflow-y-auto bg-background/30">
                <div>
                  <label className="text-xs font-semibold text-foreground mb-2 block flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary inline-block" />Input
                  </label>
                  <textarea
                    className="w-full h-20 p-3 rounded-lg bg-background border-2 border-border text-sm text-foreground font-mono resize-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 focus:outline-none transition-all"
                    value={userInput}
                    onChange={(e) => setUserInput(e.target.value)}
                    placeholder="Enter program input here..."
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-foreground mb-2 block flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-success inline-block" />Output
                  </label>
                  <textarea
                    className="w-full h-20 p-3 rounded-lg bg-background border-2 border-border text-sm text-foreground font-mono resize-none focus:outline-none"
                    value={output}
                    readOnly
                    placeholder="Program output will appear here..."
                  />
                </div>
                <Button onClick={runCode} size="lg" className="w-full h-11 font-semibold shadow-lg">
                  <Play className="w-4 h-4 mr-2" />Run Code
                </Button>
              </div>
            </div>

            {/* AI Assistant section */}
            <div className="flex-1 min-h-0 flex flex-col">
              <div className="h-12 flex items-center justify-between px-5 border-b border-border/50 bg-gradient-to-r from-secondary/40 to-secondary/20 shrink-0">
                <span className="text-sm font-bold text-foreground flex items-center gap-2">
                  <span className="text-xl">🤖</span>AI Assistant
                </span>
                {aiResponse && (
                  <Button
                    variant="ghost" size="sm"
                    onClick={() => { setAiResponse(""); setAiQuestion(""); }}
                    className="h-8 text-xs hover:bg-destructive/10 hover:text-destructive"
                  >
                    Clear
                  </Button>
                )}
              </div>

              <div className="flex-1 min-h-0 flex flex-col overflow-hidden bg-background/30">
                <div className="p-4 pb-3 border-b border-border/50 shrink-0">
                  <label className="text-xs font-semibold text-foreground mb-2 block">Ask AI</label>
                  <textarea
                    className="w-full h-24 p-3 rounded-lg bg-background border-2 border-border text-sm text-foreground resize-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 focus:outline-none transition-all"
                    placeholder="Ask: Explain this code, Find bugs, Suggest improvements..."
                    value={aiQuestion}
                    onChange={(e) => setAiQuestion(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) handleAskAI(); }}
                  />
                  <p className="text-[10px] text-muted-foreground mt-1 mb-2">Tip: Ctrl+Enter to send</p>
                  <Button
                    onClick={handleAskAI}
                    disabled={aiLoading || !aiQuestion.trim()}
                    size="lg"
                    className="w-full h-11 font-semibold shadow-lg"
                  >
                    {aiLoading
                      ? <><span className="animate-spin mr-2">⏳</span>AI is thinking...</>
                      : <><span className="mr-2">✨</span>Ask AI</>}
                  </Button>
                </div>

                <div className="flex-1 min-h-0 flex flex-col p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-foreground">Response</span>
                    {aiResponse && (
                      <span className="text-xs px-2 py-1 rounded-full bg-success/10 text-success border border-success/20">
                        ✓ Complete
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-h-0 rounded-lg bg-background border-2 border-border overflow-hidden">
                    <div className="h-full overflow-y-auto p-4">
                      {aiResponse ? (
                        <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap break-words">
                          {aiResponse}
                        </p>
                      ) : (
                        <div className="h-full flex items-center justify-center text-center">
                          <div className="space-y-3">
                            <div className="text-4xl opacity-30">💡</div>
                            <div>
                              <p className="text-sm font-medium text-foreground mb-1">AI Ready to Help</p>
                              <p className="text-xs text-muted-foreground max-w-[200px]">
                                Ask questions about your code for instant AI insights
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Console Toggle Button - Bottom Left Corner */}
      <button
        onClick={() => setShowConsole((prev) => !prev)}
        className="fixed bottom-6 left-6 z-[100] w-12 h-12 rounded-lg bg-card hover:bg-card/80 border-2 border-border hover:border-primary/50 shadow-lg hover:shadow-xl flex items-center justify-center transition-all duration-200 group"
        title={showConsole ? "Hide Console & AI Panel" : "Show Console & AI Panel"}
      >
        {showConsole
          ? <X className="w-5 h-5 text-foreground group-hover:text-primary transition-colors" />
          : <Terminal className="w-5 h-5 text-foreground group-hover:text-primary transition-colors" />}
      </button>
    </div>
  );
};

export default EditorPage;