import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { MessageSquare, Plus, Trash2, X, AlertOctagon } from "lucide-react";
import { ChatSession } from "../types";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  sessions: ChatSession[];
  activeSessionId: string | null;
  onSelectSession: (id: string) => void;
  onNewSession: () => void;
  onDeleteSession: (id: string) => void;
}

export default function Sidebar({
  isOpen,
  onClose,
  sessions,
  activeSessionId,
  onSelectSession,
  onNewSession,
  onDeleteSession
}: SidebarProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.6 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black z-40"
          />

          {/* Drawer Panel */}
          <motion.div
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", bounce: 0.1, duration: 0.4 }}
            className="fixed left-0 top-0 bottom-0 w-4/5 max-w-[320px] bg-[#0c0e14] border-r border-white/5 z-50 flex flex-col justify-between p-5 text-white"
          >
            {/* Top Toolbar */}
            <div className="space-y-6">
              <div className="flex justify-between items-center pb-2 border-b border-white/5">
                <div className="flex items-center gap-2">
                  <span className="font-display font-black text-lg tracking-wide uppercase text-violet-400">
                    Roast History
                  </span>
                </div>
                <button
                  onClick={onClose}
                  className="p-1.5 bg-white/5 hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              {/* New Session Trigger */}
              <button
                onClick={() => {
                  onNewSession();
                  onClose();
                }}
                className="w-full py-3.5 px-4 bg-gradient-to-r from-violet-600/30 to-pink-600/30 hover:from-violet-600/50 hover:to-pink-600/50 border border-purple-500/20 hover:border-purple-500/35 rounded-xl font-medium text-xs tracking-wider uppercase flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg active:scale-95"
              >
                <Plus size={14} className="text-violet-300" />
                <span>Nijere Roast Kora (New)</span>
              </button>

              {/* Sessions List */}
              <div className="space-y-2 mt-4 overflow-y-auto max-h-[55vh] custom-scrollbar pr-1">
                {sessions.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 space-y-2">
                    <AlertOctagon size={24} className="mx-auto opacity-30 text-purple-400" />
                    <p className="text-[11px] leading-relaxed">Savage logs completely empty! Start a brand new convo, mama.</p>
                  </div>
                ) : (
                  sessions.map((session) => {
                    const isActive = session.id === activeSessionId;
                    return (
                      <motion.div
                        key={session.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`group flex items-center justify-between p-3.5 rounded-xl transition-all border outline-none
                          ${
                            isActive
                              ? "bg-violet-600/20 border-violet-500/40"
                              : "bg-white/5 hover:bg-white/10 border-transparent"
                          }`}
                      >
                        <div
                          onClick={() => {
                            onSelectSession(session.id);
                            onClose();
                          }}
                          className="flex items-center gap-2.5 flex-1 min-w-0 cursor-pointer"
                        >
                          <MessageSquare
                            size={14}
                            className={isActive ? "text-pink-400 shrink-0" : "text-gray-400 shrink-0"}
                          />
                          <p className="text-xs truncate text-gray-200 font-medium tracking-wide">
                            {session.title}
                          </p>
                        </div>

                        {/* Delete single session */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteSession(session.id);
                          }}
                          className={`${
                            isActive ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                          } p-1 text-gray-400 hover:text-red-400 rounded transition-opacity cursor-pointer`}
                        >
                          <Trash2 size={13} />
                        </button>
                      </motion.div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Micro Badge info */}
            <div className="py-2.5 border-t border-white/5">
              <div className="flex items-center gap-2 bg-black/40 p-3 rounded-xl border border-white/5 text-[10px] leading-relaxed text-gray-400">
                <span className="text-xs">🤖</span>
                <span>All roasts are persistent in browser storage locally. No database downtime, ustad!</span>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
