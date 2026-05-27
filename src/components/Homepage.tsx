import { motion } from "motion/react";
import { MessageSquare, Volume2, ShieldAlert } from "lucide-react";

interface HomepageProps {
  onStartChat: () => void;
}

export default function Homepage({ onStartChat }: HomepageProps) {
  return (
    <div className="min-h-screen w-full flex flex-col justify-between items-center p-6 text-white overflow-y-auto no-tap-highlight">
      {/* Top spacing */}
      <div />

      {/* Main Glassmorphic Panel */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="w-full max-w-md glass-card rounded-3xl p-8 flex flex-col items-center text-center relative overflow-hidden"
      >
        {/* Subtle decorative color orb inside card */}
        <div className="absolute -top-12 -right-12 w-28 h-28 bg-purple-600/20 rounded-full blur-2xl" />
        <div className="absolute -bottom-12 -left-12 w-28 h-28 bg-pink-500/20 rounded-full blur-2xl" />

        {/* Dynamic Logo Emoji Icon */}
        <motion.div
          animate={{ rotate: [0, -10, 10, -5, 5, 0], scale: [1, 1.05, 1.05, 1] }}
          transition={{ repeat: Infinity, repeatDelay: 3, duration: 1.2 }}
          className="text-6xl mb-4 select-none cursor-pointer"
        >
          😭
        </motion.div>

        {/* Title */}
        <h1 className="font-display text-4xl font-extrabold tracking-wider bg-gradient-to-r from-violet-400 via-indigo-200 to-pink-400 bg-clip-text text-transparent glow-text-purple mb-2">
          RAG KORLA?
        </h1>

        {/* Subtitle */}
        <p className="font-sans text-sm text-gray-400 italic font-medium tracking-wide mb-8">
          Chat kor. Roast kha. 
        </p>

        {/* Features Preview Bento Grid for Bengali Sarcasm */}
        <div className="grid grid-cols-2 gap-3 w-full mb-8 text-left text-xs">
          <div className="bg-black/40 border border-purple-500/10 rounded-xl p-3 flex flex-col gap-1.5">
            <div className="flex items-center gap-1.5 text-purple-400 font-semibold">
              <MessageSquare size={14} />
              <span>Savage Chat</span>
            </div>
            <p className="text-gray-400 leading-relaxed text-[11px]">
              Toke shathe shathe correct uttor pabe, loge tito sarcasm-er chatni!
            </p>
          </div>

          <div className="bg-black/40 border border-pink-500/10 rounded-xl p-3 flex flex-col gap-1.5">
            <div className="flex items-center gap-1.5 text-pink-400 font-semibold">
              <Volume2 size={14} />
              <span>Bengali Voice</span>
            </div>
            <p className="text-gray-400 leading-relaxed text-[11px]">
              Sora-sori bengali bhashay toxic best friend-er voice shune roast ho!
            </p>
          </div>

          <div className="bg-black/40 border border-indigo-500/10 rounded-xl p-3 col-span-2 flex items-center gap-2.5">
            <ShieldAlert size={16} className="text-indigo-400 shrink-0 animate-pulse" />
            <div>
              <p className="text-indigo-300 font-semibold text-[11px]">Ultimate Protection Active</p>
              <p className="text-gray-400 text-[10px]">
                Defends Ikhtiar & Shipon with absolute high-power sarcasm! Try teasing their names.
              </p>
            </div>
          </div>
        </div>

        {/* Main CTA Trigger button */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onStartChat}
          className="w-full py-4 px-6 bg-gradient-to-r from-violet-600 to-pink-600 hover:from-violet-500 hover:to-pink-500 rounded-2xl text-sm font-bold tracking-wider shadow-lg shadow-purple-900/40 relative group overflow-hidden cursor-pointer"
        >
          <span className="absolute inset-x-0 bottom-0 top-0 w-full h-full bg-white/10 -translate-x-full group-hover:translate-x-0 transition-transform duration-500" />
          <span className="relative z-10">Start Chatting</span>
        </motion.button>
      </motion.div>

      {/* Styled Footer Credentials */}
      <motion.footer
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5, duration: 0.8 }}
        className="w-full text-center mt-12 mb-2 text-[10px] sm:text-xs text-gray-500 font-mono tracking-widest leading-relaxed max-w-lg"
      >
        <div className="h-[1px] w-24 bg-gradient-to-r from-transparent via-purple-600/30 to-transparent mx-auto mb-4" />
        <p className="text-gray-400 font-semibold text-xs tracking-wider uppercase mb-1">
          MD IKHTIAR AHMED
        </p>
        <p className="text-purple-500/80 font-medium tracking-widest text-[10px] mb-0.5">
          DEPARTMENT OF SOFTWARE ENGINEERING
        </p>
        <p className="text-pink-500/70 font-semibold tracking-wider text-[9px]">
          DAFFODIL INTERNATIONAL UNIVERSITY
        </p>
      </motion.footer>
    </div>
  );
}
