import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Send,
  Mic,
  Volume2,
  VolumeX,
  Menu,
  Plus,
  ArrowRight,
  Sparkles,
  Trash2,
  Home,
  MessageSquare,
  Moon,
  Info,
  ExternalLink,
  ChevronRight,
  HelpCircle
} from "lucide-react";
import Homepage from "./components/Homepage";
import Sidebar from "./components/Sidebar";
import VoicePanel from "./components/VoicePanel";
import { Message, ChatSession, VoiceSettings } from "./types";

export default function App() {
  const [showHome, setShowHome] = useState<boolean>(true);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [inputText, setInputText] = useState("");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isVoicePanelOpen, setIsVoicePanelOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [streamedText, setStreamedText] = useState("");

  const [voiceSettings, setVoiceSettings] = useState<VoiceSettings>({
    enabled: false, // Default to false so voice is stopped/muted initially
    voiceModeActive: false,
    speechVolume: 1.0,
    speechRate: 1.0,
  });

  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Initialize: Load sessions from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem("rag_korla_sessions");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setSessions(parsed);
          setActiveSessionId(parsed[0].id);
        }
      }
    } catch (e) {
      console.error("Local storage read failure:", e);
    }
  }, []);

  // Save sessions to localStorage on changes
  const saveSessions = (updated: ChatSession[]) => {
    setSessions(updated);
    try {
      localStorage.setItem("rag_korla_sessions", JSON.stringify(updated));
    } catch (e) {
      console.error("Local storage save failure:", e);
    }
  };

  // Scroll to bottom whenever messages list grows or streams updates
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [sessions, streamedText, showHome]);

  const activeSession = sessions.find((s) => s.id === activeSessionId) || null;

  // Start fresh chat session
  const handleNewSession = (initialMessageText?: string) => {
    const newId = `session_${Date.now()}`;
    const newSession: ChatSession = {
      id: newId,
      title: initialMessageText ? (initialMessageText.length > 25 ? initialMessageText.substring(0, 25) + "..." : initialMessageText) : "Fresh Roast 🔥",
      messages: [],
      createdAt: Date.now(),
    };

    const updated = [newSession, ...sessions];
    saveSessions(updated);
    setActiveSessionId(newId);
    setShowHome(false);
    return newId;
  };

  // Switch session active state
  const handleSelectSession = (id: string) => {
    setActiveSessionId(id);
    setShowHome(false);
  };

  // Delete specific session
  const handleDeleteSession = (id: string) => {
    const updated = sessions.filter((s) => s.id !== id);
    saveSessions(updated);
    if (activeSessionId === id) {
      if (updated.length > 0) {
        setActiveSessionId(updated[0].id);
      } else {
        setActiveSessionId(null);
        setShowHome(true);
      }
    }
  };

  // Web Speech synthesis to read aloud Bengali with custom tone matching
  const speakBengaliText = (text: string) => {
    if (!voiceSettings.enabled || !("speechSynthesis" in window)) return;

    window.speechSynthesis.cancel(); // Abort previous speeched lines

    // Remove markdown symbols & emojis for clean playback
    const cleanText = text
      .replace(/[\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD00-\uDFFF]/g, "")
      .replace(/\*\*+/g, "")
      .replace(/#+/g, "")
      .replace(/^- /g, "")
      .trim();

    const utterance = new SpeechSynthesisUtterance(cleanText);

    // Filter Bengali voices if available
    const voices = window.speechSynthesis.getVoices();
    const bnVoice =
      voices.find((v) => v.lang.startsWith("bn-BD")) ||
      voices.find((v) => v.lang.startsWith("bn-IN")) ||
      voices.find((v) => v.lang.includes("bn"));

    if (bnVoice) {
      utterance.voice = bnVoice;
    }
    utterance.lang = "bn-BD";
    utterance.pitch = 0.85; // Slightly lower pitch for mature male-like flavor
    utterance.rate = 1.0;
    utterance.volume = voiceSettings.speechVolume;

    window.speechSynthesis.speak(utterance);
  };

  // Master send message trigger (runs API, handles streaming, updates local state)
  const handleSendMessage = async (textToSend: string): Promise<string> => {
    const trimmed = textToSend.trim();
    if (!trimmed) return "";

    let currentSessionIdToUse = activeSessionId;

    // Auto bootstrap session if currently none exists
    if (showHome || !currentSessionIdToUse) {
      currentSessionIdToUse = handleNewSession(trimmed);
    }

    const newUserMessage: Message = {
      id: `msg_user_${Date.now()}`,
      role: "user",
      content: trimmed,
      timestamp: Date.now(),
    };

    // Grab target session
    const targetSession = sessions.find((s) => s.id === currentSessionIdToUse) || {
      id: currentSessionIdToUse,
      title: trimmed.length > 25 ? trimmed.substring(0, 25) + "..." : trimmed,
      messages: [],
      createdAt: Date.now(),
    };

    // Append user message immediately
    const updatedMessages = [...targetSession.messages, newUserMessage];
    const sessionWithUser = { ...targetSession, messages: updatedMessages };

    // Update state & store to local persistence
    const intermediateSessions = sessions.map((s) =>
      s.id === currentSessionIdToUse ? sessionWithUser : s
    );
    if (!sessions.some((s) => s.id === currentSessionIdToUse)) {
      intermediateSessions.unshift(sessionWithUser);
    }
    saveSessions(intermediateSessions);

    // Reset fields & set loading markers
    setInputText("");
    setIsGenerating(true);
    setStreamedText("");

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: updatedMessages,
          useVoice: voiceSettings.enabled,
        }),
      });

      if (!response.ok) {
        throw new Error("Bal, prompt server connected kintu response error!");
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let finishedText = "";

      if (reader) {
        let isDone = false;
        while (!isDone) {
          const { value, done } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split("\n");

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const dataStr = line.slice(6).trim();
              if (dataStr === "[DONE]") {
                isDone = true;
              } else {
                try {
                  const parsed = JSON.parse(dataStr);
                  if (parsed.text) {
                    finishedText += parsed.text;
                    setStreamedText(finishedText);
                  } else if (parsed.error) {
                    throw new Error(parsed.error);
                  }
                } catch (err) {
                  // JSON parse failures can safely be ignored on mid-cut indices
                }
              }
            }
          }
        }
      }

      // Once model streaming is successfully completed, write model response to history
      const newBotMessage: Message = {
        id: `msg_bot_${Date.now()}`,
        role: "assistant",
        content: finishedText || "Arey, kichu ekta gadbor hoise. Tui abar try kor!",
        timestamp: Date.now(),
      };

      const finalMessages = [...updatedMessages, newBotMessage];
      const sessionWithBot = {
        ...targetSession,
        title: targetSession.title === "Fresh Roast 🔥" ? (trimmed.length > 25 ? trimmed.substring(0, 25) + "..." : trimmed) : targetSession.title,
        messages: finalMessages,
      };

      const finalSessionsList = sessions.map((s) =>
        s.id === currentSessionIdToUse ? sessionWithBot : s
      );
      if (!sessions.some((s) => s.id === currentSessionIdToUse)) {
        finalSessionsList.unshift(sessionWithBot);
      }
      saveSessions(finalSessionsList);

      setIsGenerating(false);
      setStreamedText("");

      // Autoplay voice if enabled in config
      if (voiceSettings.enabled) {
        speakBengaliText(newBotMessage.content);
      }

      return newBotMessage.content;
    } catch (e: any) {
      console.error(e);
      setIsGenerating(false);
      setStreamedText("");

      const errorMessage: Message = {
        id: `msg_err_${Date.now()}`,
        role: "assistant",
        content: `Error: ${e?.message || "Internal server connection failed."}. Double check your GEMINI_API_KEY settings inside secrets!`,
        timestamp: Date.now(),
      };

      const errorSessionState = {
        ...targetSession,
        messages: [...updatedMessages, errorMessage],
      };
      saveSessions(
        sessions.map((s) => (s.id === currentSessionIdToUse ? errorSessionState : s))
      );
      return errorMessage.content;
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isGenerating) return;
    handleSendMessage(inputText);
  };

  const handleSamplePrompt = (prompt: string) => {
    setInputText(prompt);
    inputRef.current?.focus();
  };

  return (
    <div className="w-screen h-screen flex items-center justify-center font-sans tracking-wide relative overflow-hidden bg-[#050609] p-0 select-none">
      {/* Background Orbs adapted from custom Frosted Glass schema */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-orange-600/10 blur-[130px] rounded-full point-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-purple-600/10 blur-[130px] rounded-full point-events-none" />

      {/* Persistent Outer Branding watermark for large desktop screens */}
      <div className="hidden lg:block absolute left-12 top-12 opacity-[0.02] text-white">
        <h2 className="text-8xl font-display font-black tracking-tighter">SAVAGE</h2>
        <h2 className="text-8xl font-display font-black tracking-tighter ml-12">BENGALI</h2>
        <h2 className="text-8xl font-display font-black tracking-tighter ml-24">BOT</h2>
      </div>

      {/* Main Glassmorphic Mobile-First Chat Shell */}
      <div className="w-full sm:w-[410px] sm:h-[820px] h-full sm:rounded-[36px] bg-[#0c0e15]/75 sm:border sm:border-white/15 shadow-2xl flex flex-col justify-between relative overflow-hidden backdrop-blur-3xl">
        {showHome ? (
          <Homepage onStartChat={() => {
            if (sessions.length > 0 && activeSessionId) {
              setShowHome(false);
            } else {
              handleNewSession();
            }
          }} />
        ) : (
          <>
            {/* Header / Top Navbar */}
            <header className="px-5 py-4 border-b border-white/10 flex justify-between items-center bg-white/5 backdrop-blur-md shrink-0">
              <div className="flex items-center gap-3">
                {/* Menu sidebar switch */}
                <button
                  onClick={() => setIsSidebarOpen(true)}
                  className="p-2 bg-white/5 hover:bg-white/10 rounded-xl transition-colors text-slate-300 cursor-pointer active:scale-95"
                >
                  <Menu size={18} />
                </button>

                <div>
                  <div className="flex items-center gap-1.5">
                    <h2 className="text-base font-black tracking-tighter text-white">
                      RAG KORLA?
                    </h2>
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  </div>
                  <p className="text-[10px] text-orange-400 font-bold uppercase tracking-widest pl-0.5">
                    Chat & Sarcastic Roast Bot
                  </p>
                </div>
              </div>

              {/* Utility header switches */}
              <div className="flex items-center gap-2">
                {/* Global Audio Speak Speaker toggle */}
                <button
                  onClick={() =>
                    setVoiceSettings((v) => ({ ...v, enabled: !v.enabled }))
                  }
                  title={voiceSettings.enabled ? "Mute automatic roast audio speak" : "Unmute automatic roast speak"}
                  className={`p-2 rounded-xl border transition-colors cursor-pointer text-slate-300 active:scale-95
                    ${
                      voiceSettings.enabled
                        ? "bg-orange-500/10 border-orange-500/20 text-orange-400"
                        : "bg-white/5 border-white/5 text-gray-500 hover:text-gray-300"
                    }`}
                >
                  {voiceSettings.enabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
                </button>

                {/* Return Dashboard Home */}
                <button
                  onClick={() => setShowHome(true)}
                  className="p-2 bg-white/5 hover:bg-white/10 rounded-xl border border-white/5 text-slate-300 transition-colors cursor-pointer active:scale-95"
                  title="Homepage"
                >
                  <Home size={16} />
                </button>
              </div>
            </header>

            {/* Chat Body Scroll Container */}
            <div className="flex-1 overflow-y-auto px-4 py-5 space-y-5 custom-scrollbar min-h-0 bg-[#07080d]/60">
              {activeSession && activeSession.messages.length === 0 && !isGenerating && (
                <div className="py-8 text-center space-y-6">
                  {/* Floating mascot badge */}
                  <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-pink-500/20 via-violet-500/10 to-orange-500/20 flex items-center justify-center mx-auto border border-white/10 shadow-lg shadow-purple-950/20">
                    <span className="text-3xl">👺</span>
                  </div>

                  <div className="space-y-1">
                    <p className="font-display font-extrabold text-base text-gray-200">
                      Savage Bengali best friend is waiting!
                    </p>
                    <p className="text-[11px] text-gray-400 max-w-xs mx-auto leading-relaxed">
                      Ask your worst questions or brag about yourself. You will get correct answers backed by high-energy Bengali roasts, ustad!
                    </p>
                  </div>

                  {/* Suggestive quick trigger items */}
                  <div className="space-y-2 max-w-xs mx-auto text-left pt-2">
                    <p className="text-[10px] text-orange-400 font-bold tracking-widest uppercase pl-1">Suggested Roast Prompts</p>
                    <button
                      onClick={() => handleSamplePrompt("What is programming?")}
                      className="w-full text-left p-3 bg-white/5 hover:bg-white/10 active:bg-white/15 border border-white/5 rounded-xl text-xs text-gray-300 flex items-center justify-between group transition-all"
                    >
                      <span>"Coding shikhte chai, help kor!"</span>
                      <ChevronRight size={12} className="text-gray-500 group-hover:text-amber-400 transition-colors" />
                    </button>
                    <button
                      onClick={() => handleSamplePrompt("How do I impress a girl?")}
                      className="w-full text-left p-3 bg-white/5 hover:bg-white/10 active:bg-white/15 border border-white/5 rounded-xl text-xs text-gray-300 flex items-center justify-between group transition-all"
                    >
                      <span>"Meye impressed korbo kibhabe?"</span>
                      <ChevronRight size={12} className="text-gray-500 group-hover:text-amber-400 transition-colors" />
                    </button>
                    <button
                      onClick={() => handleSamplePrompt("Ikhtiar is a bad coder")}
                      className="w-full text-left p-3 bg-white/5 hover:bg-white/10 active:bg-white/15 border border-white/5 rounded-xl text-xs text-red-300/90 flex items-center justify-between group transition-all"
                    >
                      <span>⚡ Provoke Protection: Test "Ikhtiar"</span>
                      <ChevronRight size={12} className="text-red-500/50 group-hover:text-red-400 transition-colors" />
                    </button>
                  </div>
                </div>
              )}

              {/* Message List Rendering */}
              {activeSession?.messages.map((msg) => {
                const isUser = msg.role === "user";
                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${isUser ? "items-end" : "items-start animate-[fadeIn_0.3s_ease]"}`}
                  >
                    <div
                      className={`relative p-3.5 rounded-2xl max-w-[85%] text-xs sm:text-sm leading-relaxed tracking-wide select-text
                        ${
                          isUser
                            ? "bg-gradient-to-br from-orange-600 to-orange-700 text-white border border-white/10 rounded-tr-none shadow-md shadow-orange-950/20"
                            : "bg-white/10 backdrop-blur-md text-slate-200 border border-white/5 rounded-tl-none"
                        }`}
                    >
                      {/* Message Output split with paragraph spacing */}
                      <p className="whitespace-pre-wrap">{msg.content}</p>

                      {/* Manual audio speaker trigger for bot answers */}
                      {!isUser && (
                        <div className="absolute right-2 bottom-[-14px] flex items-center gap-1.5">
                          <button
                            onClick={() => speakBengaliText(msg.content)}
                            title="Hear Bengali Roast Synthesized Voice"
                            className="bg-[#121420] border border-white/10 text-orange-400 p-1 rounded-full hover:bg-amber-950 hover:text-white transition-all shadow shadow-black flex items-center justify-center cursor-pointer active:scale-90"
                          >
                            <Volume2 size={11} className="shrink-0" />
                          </button>
                        </div>
                      )}
                    </div>
                    {/* Timestamp Info */}
                    <span className="text-[9px] uppercase tracking-wider text-gray-500 mt-1 ml-1 select-none">
                      {isUser ? "Tui / You" : "RAG KORLA?"}
                    </span>
                  </div>
                );
              })}

              {/* Streaming Content Indicator */}
              {isGenerating && streamedText && (
                <div className="flex flex-col items-start">
                  <div className="bg-white/10 backdrop-blur-md p-3.5 rounded-2xl rounded-tl-none border border-white/5 max-w-[85%] text-xs sm:text-sm leading-relaxed text-slate-200">
                    {/* Tiny animated pulse indicator */}
                    <div className="flex gap-1 mb-1.5 items-center">
                      <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-ping" />
                      <span className="text-[10px] text-orange-400 font-bold uppercase tracking-widest pl-1">Analyzing...</span>
                    </div>
                    <p className="whitespace-pre-wrap">{streamedText}</p>
                  </div>
                  <span className="text-[9px] text-orange-400/80 mt-1 ml-1 tracking-widest uppercase font-semibold">Toking... 💬</span>
                </div>
              )}

              {/* Fallback Typing Loader */}
              {isGenerating && !streamedText && (
                <div className="flex flex-col items-start animate-pulse">
                  <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl rounded-tl-none border border-white/5 max-w-[85%]">
                    <div className="flex space-x-1.5 items-center justify-center h-4 w-12">
                      <div className="w-1.5 h-1.5 bg-orange-500 rounded-full typing-dot" />
                      <div className="w-1.5 h-1.5 bg-purple-500 rounded-full typing-dot" />
                      <div className="w-1.5 h-1.5 bg-orange-400 rounded-full typing-dot" />
                    </div>
                  </div>
                  <span className="text-[9px] text-gray-500 mt-1 ml-1 uppercase">Reasoning...</span>
                </div>
              )}

              <div ref={chatEndRef} />
            </div>

            {/* Sticky bottom Input Bar Panel */}
            <div className="p-4 bg-black/40 backdrop-blur-3xl border-t border-white/10 shrink-0">
              <form onSubmit={handleFormSubmit} className="relative flex items-center gap-2">
                {/* Voice mode loader button */}
                <button
                  type="button"
                  onClick={() => setIsVoicePanelOpen(true)}
                  title="Open Special Voice Chat Mode"
                  className="p-3 bg-gradient-to-tr from-pink-500/10 to-violet-500/10 hover:from-pink-500/20 hover:to-violet-500/20 border border-white/10 rounded-2xl text-slate-300 transition-all outline-none cursor-pointer active:scale-90 flex items-center justify-center shrink-0"
                >
                  <Mic size={18} className="text-pink-400 animate-pulse" />
                </button>

                <div className="relative flex-1 flex items-center">
                  <input
                    ref={inputRef}
                    disabled={isGenerating}
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder={
                      isGenerating
                        ? "Bhai shobor kor... response ditesi!"
                        : "Ask questions, get roasted..."
                    }
                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-3.5 pl-4 pr-12 text-xs sm:text-sm text-white focus:outline-none focus:border-orange-500/60 transition-all placeholder:text-gray-500 disabled:opacity-50"
                  />

                  {/* Send Action Trigger */}
                  <button
                    type="submit"
                    disabled={!inputText.trim() || isGenerating}
                    className="absolute right-1.5 p-2 bg-orange-600 hover:bg-orange-500 disabled:bg-white/5 disabled:opacity-40 rounded-xl transition-all text-white outline-none cursor-pointer flex items-center justify-center"
                  >
                    <Send size={15} />
                  </button>
                </div>
              </form>

              {/* Status Voice Playback Enabled overlay badge */}
              {voiceSettings.enabled && (
                <div className="flex justify-center mt-3">
                  <div className="px-2.5 py-1 rounded-full bg-orange-500/10 border border-orange-500/30 backdrop-blur-md">
                    <span className="text-[9px] font-bold text-orange-400 uppercase tracking-widest">
                      Voice Playback Enabled
                    </span>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Persistent Drawer Navigation (History & New Session triggers) */}
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        sessions={sessions}
        activeSessionId={activeSessionId}
        onSelectSession={handleSelectSession}
        onNewSession={() => handleNewSession()}
        onDeleteSession={handleDeleteSession}
      />

      {/* Voice Panel Overlay */}
      <AnimatePresence>
        {isVoicePanelOpen && (
          <VoicePanel
            onClose={() => setIsVoicePanelOpen(false)}
            settings={voiceSettings}
            onSettingsChange={setVoiceSettings}
            onSendMessage={handleSendMessage}
            isGenerating={isGenerating}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
