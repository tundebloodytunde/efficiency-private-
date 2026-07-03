import Link from "next/link";

export const dynamic = 'force-dynamic';

const QUOTES = [
  // Thomas Sowell
  { text: "There are no solutions. There are only trade-offs.", author: "Thomas Sowell" },
  { text: "People who enjoy meetings should not be in charge of anything.", author: "Thomas Sowell" },
  { text: "It takes considerable knowledge just to realize the extent of your own ignorance.", author: "Thomas Sowell" },
  { text: "When you want to help people, you tell them the truth. When you want to help yourself, you tell them what they want to hear.", author: "Thomas Sowell" },
  { text: "Talkers are usually more articulate than doers, since talk is their specialty.", author: "Thomas Sowell" },
  { text: "Much of the social history of the Western world has been a history of replacing what worked with what sounded good.", author: "Thomas Sowell" },
  { text: "The first lesson of economics is scarcity. The first lesson of politics is to disregard the first lesson of economics.", author: "Thomas Sowell" },
  { text: "One of the most important reasons for studying history is that virtually every stupid idea that is in vogue today has been tried before and failed.", author: "Thomas Sowell" },
  { text: "Civilization has been aptly called a thin crust over a volcano.", author: "Thomas Sowell" },
  { text: "The most basic question is not what is best, but who shall decide what is best.", author: "Thomas Sowell" },
  { text: "Each new generation born is in effect an invasion of civilization by little barbarians, who must be civilized before it is too late.", author: "Thomas Sowell" },
  { text: "Knowledge is the foundation of freedom.", author: "Thomas Sowell" },
  { text: "Rhetoric is no substitute for reality.", author: "Thomas Sowell" },
  { text: "The real goal should be reduced government, not improved government.", author: "Thomas Sowell" },
  { text: "If you have always believed that everyone should play by the same rules and be judged by the same standards, that would have gotten you labeled a radical 60 years ago, a liberal 30 years ago and a racist today.", author: "Thomas Sowell" },
  // Marcus Aurelius
  { text: "You have power over your mind, not outside events. Realize this, and you will find strength.", author: "Marcus Aurelius" },
  { text: "The impediment to action advances action. What stands in the way becomes the way.", author: "Marcus Aurelius" },
  { text: "Waste no more time arguing about what a good man should be. Be one.", author: "Marcus Aurelius" },
  { text: "Confine yourself to the present.", author: "Marcus Aurelius" },
  { text: "If it is not right, do not do it; if it is not true, do not say it.", author: "Marcus Aurelius" },
  { text: "The best revenge is to be unlike him who performed the injury.", author: "Marcus Aurelius" },
  { text: "You always own the option of having no opinion.", author: "Marcus Aurelius" },
  { text: "The soul becomes dyed with the color of its thoughts.", author: "Marcus Aurelius" },
  { text: "It is not death that a man should fear, but he should fear never beginning to live.", author: "Marcus Aurelius" },
  { text: "Very little is needed to make a happy life; it is all within yourself, in your way of thinking.", author: "Marcus Aurelius" },
  { text: "Begin at once to live, and count each separate day as a separate life.", author: "Marcus Aurelius" },
  { text: "Never let the future disturb you. You will meet it, if you have to, with the same weapons of reason which today arm you against the present.", author: "Marcus Aurelius" },
  // Epictetus
  { text: "It's not what happens to you, but how you react to it that matters.", author: "Epictetus" },
  { text: "Make the best use of what is in your power, and take the rest as it happens.", author: "Epictetus" },
  { text: "No man is free who is not master of himself.", author: "Epictetus" },
  { text: "First say to yourself what you would be; and then do what you have to do.", author: "Epictetus" },
  { text: "Seek not the good in external things; seek it in yourself.", author: "Epictetus" },
  { text: "He is a wise man who does not grieve for the things which he has not, but rejoices for those which he has.", author: "Epictetus" },
  { text: "The key is to keep company only with people who uplift you, whose presence calls forth your best.", author: "Epictetus" },
  { text: "Seek not that the things which happen should happen as you wish; but wish the things which happen to be as they are, and you will have a tranquil flow of life.", author: "Epictetus" },
  // Seneca
  { text: "We suffer more in imagination than in reality.", author: "Seneca" },
  { text: "Luck is what happens when preparation meets opportunity.", author: "Seneca" },
  { text: "Difficulty shows what men are.", author: "Seneca" },
  { text: "Everything is alien to us; time alone is ours.", author: "Seneca" },
  { text: "He who is everywhere is nowhere.", author: "Seneca" },
  { text: "Retire into yourself as much as you can.", author: "Seneca" },
  { text: "If you wish to be loved, love.", author: "Seneca" },
  { text: "A gem cannot be polished without friction, nor a man perfected without trials.", author: "Seneca" },
];

function getDailyQuote() {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const dayOfYear = Math.floor((now.getTime() - start.getTime()) / 86_400_000);
  return QUOTES[dayOfYear % QUOTES.length];
}

export default function Home() {
  const quote = getDailyQuote();

  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-600 to-pink-600 flex items-center justify-center text-3xl font-black text-white mb-8 shadow-2xl shadow-violet-500/30">
        E
      </div>
      <h1 className="text-5xl sm:text-7xl font-black tracking-tight mb-4 bg-gradient-to-r from-violet-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent">
        Efficiency
      </h1>
      <p className="text-xl text-gray-500 mb-10 max-w-sm">
        Your tasks, calendar, and daily brief — all in one place.
      </p>
      <Link
        href="/today"
        className="bg-gradient-to-r from-violet-600 to-pink-600 text-white px-10 py-4 rounded-2xl text-lg font-bold hover:opacity-90 transition-all active:scale-95 shadow-xl shadow-violet-500/30 mb-16"
      >
        Start Today →
      </Link>

      {/* Daily quote */}
      <div className="max-w-lg w-full mx-auto px-4">
        <div className="relative rounded-3xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 px-8 py-7 text-left">
          <span className="absolute -top-4 left-6 text-5xl leading-none text-violet-400/40 select-none font-serif">&ldquo;</span>
          <p className="text-gray-700 dark:text-gray-300 text-base sm:text-lg leading-relaxed italic font-medium">
            {quote.text}
          </p>
          <p className="mt-4 text-sm font-semibold text-violet-500 dark:text-violet-400">
            — {quote.author}
          </p>
        </div>
        <p className="text-xs text-gray-400 dark:text-gray-600 mt-3">Quote of the day</p>
      </div>
    </div>
  );
}
