export default function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-zinc-900 via-indigo-950 to-black overflow-hidden relative">
      {/* Background decoration */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[500px] bg-indigo-500/20 blur-[120px] rounded-full pointer-events-none" />

      <main className="relative z-10 flex flex-col items-center p-8 text-center">
        <div className="relative group">
          {/* Glow effect behind text */}
          <div className="absolute -inset-2 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg blur-lg opacity-30 group-hover:opacity-60 transition duration-500" />

          <h1 className="relative text-6xl md:text-8xl font-bold tracking-tighter text-white drop-shadow-sm">
            Hello <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-300 to-purple-300">World</span>
          </h1>
        </div>

        <p className="mt-8 text-lg md:text-xl text-zinc-400 max-w-lg mx-auto font-light leading-relaxed">
          Welcome to your new Next.js application designed with modern aesthetics.
        </p>

        <div className="mt-10 flex gap-4">
          <button className="px-6 py-3 rounded-full bg-white text-black font-semibold hover:bg-zinc-200 transition active:scale-95">
            Get Started
          </button>
          <button className="px-6 py-3 rounded-full border border-white/20 text-white font-semibold hover:bg-white/10 transition active:scale-95">
            Learn More
          </button>
        </div>
      </main>
    </div>
  );
}
