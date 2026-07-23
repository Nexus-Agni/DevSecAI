export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center p-4">
      <header className="w-full max-w-5xl py-8">
        <h1 className="text-2xl font-bold text-primary tracking-widest text-center">DEVSEC<span className="text-foreground">AI</span></h1>
      </header>
      {children}
    </div>
  );
}
