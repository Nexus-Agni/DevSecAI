import Link from 'next/link';

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-24 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#1a0b00] to-background">
      <div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm flex flex-col gap-8 text-center">
        <h1 className="text-6xl font-bold tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-primary to-amber-500 shadow-neon p-4">
          DEVSEC AI ANALYST
        </h1>
        <p className="text-xl text-muted-foreground max-w-[600px]">
          AI-Powered Security Analysis Platform. Deep code scanning, secrets detection, and CVE analysis using advanced LLMs.
        </p>
        <div className="flex gap-4 mt-8">
          <Link 
            href="/login"
            className="px-8 py-3 rounded-md bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-all shadow-neon"
          >
            LOGIN
          </Link>
          <Link 
            href="/signup"
            className="px-8 py-3 rounded-md border border-primary text-primary hover:bg-primary/10 transition-all"
          >
            SIGN UP
          </Link>
        </div>
      </div>
    </main>
  );
}
