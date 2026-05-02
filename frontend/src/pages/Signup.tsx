import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Code2, Eye, EyeOff, Users, Zap, Shield } from "lucide-react";
import axios from "axios";
import { toast } from "sonner";

const SOCKET_URL = "http://localhost:1600";

const Signup = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name || !email || !password) {
      toast.error("Please fill in all fields");
      return;
    }

    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    try {
      setLoading(true);
      const res = await axios.post(`${SOCKET_URL}/api/auth/register`, {
        email,
        password,
        username: name,
      });

      if (res.data.token) {
        localStorage.setItem("token", res.data.token);
        const userData = {
          email,
          username: res.data.username || name,
        };
        localStorage.setItem("user", JSON.stringify(userData));
        toast.success("Account created successfully!");
        navigate("/editor");
      }
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || err.response?.data?.message || "Registration failed";
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const features = [
    { icon: Users, title: "Real-time collaboration", desc: "Code with your team simultaneously" },
    { icon: Zap, title: "Instant sync", desc: "Changes appear in milliseconds" },
    { icon: Shield, title: "Secure workspaces", desc: "End-to-end encrypted sessions" },
  ];

  return (
    <div className="min-h-screen flex bg-background">
      {/* Left Panel - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md space-y-8 animate-in-up">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
              <Code2 className="w-5 h-5 text-primary" />
            </div>
            <span className="text-xl font-semibold text-foreground">CodeSync</span>
          </div>

          <div>
            <h2 className="text-2xl font-bold text-foreground">Create your account</h2>
            <p className="text-muted-foreground mt-1">Start collaborating in seconds</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2 animate-in-up-delay-1">
              <label className="text-sm font-medium text-foreground">Full name</label>
              <Input
                type="text"
                placeholder="John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="bg-card border-border focus:border-primary/50 h-11"
              />
            </div>

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
              <label className="text-sm font-medium text-foreground">Password</label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="Min. 6 characters"
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
              {password.length > 0 && (
                <div className="flex gap-1 mt-2">
                  {[1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className={`h-1 flex-1 rounded-full transition-colors duration-300 ${
                        password.length >= i * 3
                          ? i <= 2 ? "bg-destructive" : i === 3 ? "bg-warning" : "bg-success"
                          : "bg-border"
                      }`}
                    />
                  ))}
                </div>
              )}
            </div>

            <Button type="submit" className="w-full h-11 font-medium animate-in-up-delay-3" disabled={loading}>
              {loading ? "Creating Account..." : "Create Account"}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link to="/login" className="text-primary hover:text-primary/80 font-medium transition-colors">
              Sign in
            </Link>
          </p>
        </div>
      </div>

      {/* Right Panel - Features */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden flex-col justify-center p-12">
        <div className="absolute inset-0 bg-gradient-to-bl from-accent/5 via-background to-primary/10" />
        <div className="absolute top-40 right-10 w-80 h-80 rounded-full bg-primary/5 blur-3xl animate-pulse-slow" />
        <div className="absolute bottom-10 left-20 w-64 h-64 rounded-full bg-accent/5 blur-3xl animate-pulse-slow" />

        <div className="relative z-10 space-y-10">
          <div className="animate-in-up-delay-1">
            <h2 className="text-3xl font-bold text-foreground mb-3">
              Everything you need to<br />
              <span className="text-gradient">ship together.</span>
            </h2>
          </div>

          <div className="space-y-6">
            {features.map((feature, i) => (
              <div
                key={feature.title}
                className={`flex items-start gap-4 p-4 rounded-lg border border-border bg-card/50 hover:border-primary/20 transition-all duration-300 animate-in-up-delay-${i + 1}`}
              >
                <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                  <feature.icon className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">{feature.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Signup;
