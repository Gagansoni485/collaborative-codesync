import React from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Code2, ArrowRight, Terminal, Users, Zap, GitBranch, Lock, Sparkles } from "lucide-react";

const features = [
  { icon: Users, title: "Live collaboration", desc: "See cursors, selections, and changes in real-time" },
  { icon: Terminal, title: "Built-in terminal", desc: "Run commands without leaving the editor" },
  { icon: GitBranch, title: "Git integration", desc: "Commit, push, and manage branches seamlessly" },
  { icon: Lock, title: "Encrypted sessions", desc: "Your code stays private and secure" },
  { icon: Zap, title: "Instant sync", desc: "Sub-50ms latency for all operations" },
  { icon: Sparkles, title: "AI assist", desc: "Intelligent code completions and suggestions" },
];

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="h-14 border-b border-border flex items-center justify-between px-6 bg-card/50 backdrop-blur-sm fixed top-0 w-full z-50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
            <Code2 className="w-4 h-4 text-primary" />
          </div>
          <span className="font-semibold text-foreground">CodeSync</span>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/login">
            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
              Sign In
            </Button>
          </Link>
          <Link to="/signup">
            <Button size="sm">Get Started</Button>
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-20 px-6 relative overflow-hidden">
        <div className="absolute top-20 left-1/4 w-96 h-96 rounded-full bg-primary/5 blur-3xl animate-pulse-slow" />
        <div className="absolute bottom-0 right-1/4 w-80 h-80 rounded-full bg-accent/5 blur-3xl animate-pulse-slow" />

        <div className="max-w-3xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border bg-card text-xs text-muted-foreground mb-6 animate-in-up">
            <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
            Now in public beta
          </div>

          <h1 className="text-5xl sm:text-6xl font-bold leading-tight tracking-tight animate-in-up-delay-1">
            Code together,<br />
            <span className="text-gradient">ship faster.</span>
          </h1>

          <p className="text-lg text-muted-foreground mt-6 max-w-xl mx-auto animate-in-up-delay-2">
            A collaborative code editor built for modern teams. Real-time editing,
            live cursors, integrated terminal, and seamless git workflows.
          </p>

          <div className="flex items-center justify-center gap-4 mt-8 animate-in-up-delay-3">
            <Link to="/signup">
              <Button size="lg" className="h-12 px-8 text-sm font-medium">
                Start coding free
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
            <Link to="/editor">
              <Button variant="outline" size="lg" className="h-12 px-8 text-sm bg-card border-border hover:border-primary/30">
                Try the demo
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Editor Preview */}
      <section className="px-6 pb-20">
        <div className="max-w-4xl mx-auto animate-in-up-delay-3">
          <div className="rounded-xl border border-border bg-card overflow-hidden shadow-2xl shadow-primary/5">
            {/* Window chrome */}
            <div className="h-10 bg-secondary/50 border-b border-border flex items-center px-4 gap-2">
              <div className="w-3 h-3 rounded-full bg-destructive/40" />
              <div className="w-3 h-3 rounded-full bg-warning/40" />
              <div className="w-3 h-3 rounded-full bg-success/40" />
              <span className="text-xs text-muted-foreground ml-3">CodeSync — my-project</span>
            </div>
            {/* Fake editor content */}
            <div className="p-6 font-mono text-sm space-y-1 bg-editor-bg">
              <p><span className="text-editor-gutter mr-4">1</span><span className="text-info">import</span> {"{"} createServer {"}"} <span className="text-info">from</span> <span className="text-accent">"@codesync/core"</span>;</p>
              <p><span className="text-editor-gutter mr-4">2</span></p>
              <p><span className="text-editor-gutter mr-4">3</span><span className="text-info">const</span> server = <span className="text-info">await</span> <span className="text-warning">createServer</span>({"{"}</p>
              <p><span className="text-editor-gutter mr-4">4</span>  <span className="text-primary">port</span>: <span className="text-warning">3000</span>,</p>
              <p><span className="text-editor-gutter mr-4">5</span>  <span className="text-primary">collaborative</span>: <span className="text-accent">true</span>,</p>
              <p><span className="text-editor-gutter mr-4">6</span>  <span className="text-primary">maxUsers</span>: <span className="text-warning">50</span>,</p>
              <p>
                <span className="text-editor-gutter mr-4">7</span>{"}"});
                <span className="w-0.5 h-4 bg-primary inline-block animate-cursor-blink ml-0.5" />
                <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-accent/10 text-accent border border-accent/20">Sarah C.</span>
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="px-6 pb-24">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-center text-foreground mb-12">
            Everything you need to <span className="text-gradient">build together</span>
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {features.map((f, i) => (
              <div
                key={f.title}
                className="p-5 rounded-lg border border-border bg-card hover:border-primary/20 transition-all duration-300 group"
              >
                <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center mb-3 group-hover:bg-primary/15 transition-colors">
                  <f.icon className="w-4 h-4 text-primary" />
                </div>
                <h3 className="font-semibold text-foreground text-sm mb-1">{f.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8 px-6">
        <div className="max-w-4xl mx-auto flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <Code2 className="w-3.5 h-3.5 text-primary" />
            <span>CodeSync</span>
          </div>
          <span>© 2026 CodeSync. All rights reserved.</span>
        </div>
      </footer>
    </div>
  );
};

export default Index;
