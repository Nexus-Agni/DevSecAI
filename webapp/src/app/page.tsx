"use client";
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Shield, Lock, FileCode, Server, ChevronRight } from 'lucide-react';

export default function Home() {
  return (
    <main className="min-h-screen bg-[#050505] selection:bg-primary/30 relative overflow-hidden text-foreground">
      {/* Grid Background Pattern */}
      <div className="absolute inset-0 z-0 bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f2e_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]"></div>

      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 h-16 border-b border-border/40 bg-[#050505]/80 backdrop-blur-md z-50">
        <div className="max-w-7xl mx-auto px-6 h-full flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="text-primary" size={24} />
            <span className="font-bold text-xl tracking-tight text-white">DEVSEC<span className="text-primary">AI</span></span>
          </div>
          <div className="flex items-center gap-6">
            <Link href="/login" className="text-sm font-medium text-muted-foreground hover:text-white transition-colors">
              Sign In
            </Link>
            <Link href="/signup" className="relative group text-sm font-medium">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-primary to-indigo-600 rounded-lg blur opacity-40 group-hover:opacity-100 transition duration-200"></div>
              <div className="relative bg-black text-white px-4 py-2 rounded-lg border border-white/10 hover:border-white/20 transition-colors">
                Get Started
              </div>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-6 z-10">
        <div className="max-w-7xl mx-auto flex flex-col items-center text-center mt-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="flex flex-col items-center"
          >
            <Link href="#features" className="inline-flex items-center gap-2 bg-white/5 border border-white/10 text-zinc-300 px-4 py-1.5 rounded-full text-sm font-medium mb-8 hover:bg-white/10 transition-colors">
              <span className="flex h-2 w-2 rounded-full bg-primary animate-pulse"></span>
              Introducing Full-Context Engine v2.0
              <ChevronRight size={14} className="text-muted-foreground" />
            </Link>
            
            <h1 className="text-5xl md:text-8xl font-extrabold tracking-tight mb-8 text-white max-w-4xl leading-tight">
              Secure code with <br className="hidden md:block" />
              <span className="text-transparent bg-clip-text bg-gradient-to-b from-white to-white/40">
                Agentic AI Analysis
              </span>
            </h1>
            
            <p className="text-lg md:text-xl text-zinc-400 max-w-2xl mx-auto mb-12">
              DevSecAI automatically clones, parses, and deeply analyzes your entire repository for hardcoded secrets, OWASP Top 10 vulnerabilities, and misconfigurations using 1M-token LLM context windows.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
              <Link href="/signup" className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl blur opacity-60 group-hover:opacity-100 transition duration-500 group-hover:duration-200"></div>
                <button className="relative bg-black px-8 py-4 rounded-xl text-white font-bold text-lg border border-white/10 flex items-center gap-2">
                  Start Free Scan
                  <ChevronRight size={18} />
                </button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="relative py-32 z-10">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-20">
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-6 text-white">Enterprise-Grade Pipeline</h2>
            <p className="text-zinc-400 text-lg">Everything you need to secure your CI/CD workflow instantly.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { icon: FileCode, title: "SAST Scanning", desc: "Detect SQLi, XSS, and complex logic flaws using deep context understanding." },
              { icon: Lock, title: "Secrets Detection", desc: "Find leaked API keys, tokens, and passwords before they reach production." },
              { icon: Server, title: "IaC Misconfigurations", desc: "Ensure your Terraform and Dockerfiles adhere to strict security baselines." }
            ].map((f, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ delay: i * 0.2, duration: 0.5 }}
                className="relative group p-[1px] rounded-3xl overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                <div className="relative h-full bg-[#0a0a0a] border border-white/5 p-8 rounded-[23px] flex flex-col items-start hover:bg-white/[0.02] transition-colors">
                  <div className="w-14 h-14 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-white/10 rounded-2xl flex items-center justify-center mb-6 shadow-[0_0_30px_-5px_rgba(99,102,241,0.3)]">
                    <f.icon className="text-indigo-400" size={26} />
                  </div>
                  <h3 className="text-2xl font-bold mb-4 text-zinc-100">{f.title}</h3>
                  <p className="text-zinc-400 leading-relaxed text-lg">{f.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
      
      {/* Footer */}
      <footer className="relative border-t border-white/10 py-12 bg-[#050505] z-10">
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between text-sm text-zinc-500">
          <div className="flex items-center gap-2">
            <Shield size={18} className="text-primary/70" /> DEVSECAI
          </div>
          <p>© 2026 DevSecAI Inc. All rights reserved.</p>
        </div>
      </footer>
    </main>
  );
}
