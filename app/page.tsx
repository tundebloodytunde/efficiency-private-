import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center py-32 text-center">
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-600 to-pink-600 flex items-center justify-center text-3xl font-black text-white mb-8 shadow-2xl shadow-violet-500/30">
        E
      </div>
      <h1 className="text-7xl font-black tracking-tight mb-4 bg-gradient-to-r from-violet-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent">
        Efficiency
      </h1>
      <p className="text-xl text-gray-500 dark:text-gray-500 mb-12 max-w-sm">
        Your tasks, calendar, and daily brief — all in one place.
      </p>
      <Link
        href="/today"
        className="bg-gradient-to-r from-violet-600 to-pink-600 text-white px-10 py-4 rounded-2xl text-lg font-bold hover:opacity-90 transition-all active:scale-95 shadow-xl shadow-violet-500/30"
      >
        Start Today →
      </Link>
    </div>
  );
}
