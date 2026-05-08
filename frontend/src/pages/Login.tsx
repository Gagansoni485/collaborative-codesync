import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Code2, Eye, EyeOff } from "lucide-react";
import axios from "axios";
import { toast } from "sonner";

const SOCKET_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:1600";

const Login = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast.error("Please fill in all fields");
      return;
    }

    try {
      setLoading(true);
      const res = await axios.post(`${SOCKET_URL}/api/auth/login`, {
        email,
        password,
      });

      if (res.data.token) {
        localStorage.setItem("token", res.data.token);
        const userData = {
          email,
          username: res.data.username || email,
        };
        localStorage.setItem("user", JSON.stringify(userData));
        toast.success("Logged in successfully!");
        navigate("/editor");
      }
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || err.response?.data?.message || "Login failed";
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-background">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden flex-col justify-between p-12">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-accent/5" />
        <div className="absolute top-20 -left-20 w-72 h-72 rounded-full bg-primary/5 blur-3xl animate-pulse-slow" />
        <div className="absolute bottom-20 right-10 w-96 h-96 rounded-full bg-accent/5 blur-3xl animate-pulse-slow" />

        <div className="relative z-10 animate-in-up">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
              <Code2 className="w-5 h-5 text-primary" />
            </div>
            <span className="text-xl font-semibold text-foreground">CodeSync</span>
          </div>
        </div>

        <div className="relative z-10 space-y-6 animate-in-up-delay-1">
          <h1 className="text-4xl font-bold leading-tight text-foreground">
            Code together,<br />
            <span className="text-gradient">build faster.</span>
          </h1>
          <p className="text-muted-foreground text-lg max-w-md">
            Real-time collaborative code editor with live cursors, instant sync, and built-in terminal.
          </p>
        </div>

        {/* Code snippet preview */}
        <div className="relative z-10 animate-in-up-delay-2">
          <div className="rounded-lg border border-border bg-card p-4 font-mono text-sm max-w-md">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-3 h-3 rounded-full bg-destructive/60" />
              <div className="w-3 h-3 rounded-full bg-warning/60" />
              <div className="w-3 h-3 rounded-full bg-success/60" />
              <span className="text-muted-foreground text-xs ml-2">main.ts</span>
            </div>
            <div className="space-y-1">
              <p><span className="text-info">const</span> <span className="text-foreground">server</span> = <span className="text-info">await</span> <span className="text-accent">createServer</span>({"{"}</p>
              <p className="pl-4"><span className="text-primary">port</span>: <span className="text-warning">3000</span>,</p>
              <p className="pl-4"><span className="text-primary">live</span>: <span className="text-accent">true</span>,</p>
              <p>{"}"})<span className="w-0.5 h-4 bg-primary inline-block animate-cursor-blink ml-0.5" /></p>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md space-y-8 animate-in-up">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
              <Code2 className="w-5 h-5 text-primary" />
            </div>
            <span className="text-xl font-semibold text-foreground">CodeSync</span>
          </div>

          <div>
            <h2 className="text-2xl font-bold text-foreground">Welcome back</h2>
            <p className="text-muted-foreground mt-1">Sign in to your workspace</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2 animate-in-up-delay-1">
              <label className="text-sm font-medium text-foreground">Email</label>
              <Input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-card border-border focus:border-primary/50 h-11"
              />
            </div>

            <div className="space-y-2 animate-in-up-delay-2">
              <div className="flex justify-between">
                <label className="text-sm font-medium text-foreground">Password</label>
              </div>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-card border-border focus:border-primary/50 h-11 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <Button type="submit" className="w-full h-11 font-medium animate-in-up-delay-3" disabled={loading}>
              {loading ? "Signing In..." : "Sign In"}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground">
            Don't have an account?{" "}
            <Link to="/signup" className="text-primary hover:text-primary/80 font-medium transition-colors">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
