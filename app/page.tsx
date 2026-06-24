import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center py-16 sm:py-32 text-center">
      <h1 className="text-4xl sm:text-6xl font-bold mb-4 tracking-tight">Efficiency</h1>
      <p className="text-xl text-gray-500 mb-10">Work better, every day.</p>
      <Link
        href="/today"
        className="bg-blue-600 text-white px-8 py-4 rounded-2xl text-lg font-semibold hover:bg-blue-700 transition-all active:scale-95"
      >
        Start Today →
      </Link>
    </div>
  );
}
