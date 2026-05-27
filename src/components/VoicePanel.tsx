import React, { useState, useEffect, useRef } from "react";
import { motion } from "motion/react";
import { Mic, MicOff, Volume2, X, AlertTriangle, Radio } from "lucide-react";
import { VoiceSettings } from "../types";

interface VoicePanelProps {
  onClose: () => void;
  settings: VoiceSettings;
  onSettingsChange: (settings: VoiceSettings) => void;
  onSendMessage: (text: string) => Promise<string>;
  isGenerating: boolean;
}

export default function VoicePanel({
  onClose,
  settings,
  onSettingsChange,
  onSendMessage,
  isGenerating
}: VoicePanelProps) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [aiSpeechOutput, setAiSpeechOutput] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [speechActive, setSpeechActive] = useState(false);

  const recognitionRef = useRef<any>(null);

  // Initialize Speech Synthesis Voices
  useEffect(() => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    return () => {
      if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Web Speech API - Speech Recognition Setup
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setErrorMsg(
        "Arey mofiz! Tor browser-e Speech Recognition support kore na. Chrome ba Edge use kor ustad!"
      );
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "bn-BD"; // Recognize Bengali natively

    recognition.onstart = () => {
      setIsListening(true);
      setErrorMsg("");
      setTranscript("Listening mama... bolo!");
    };

    recognition.onresult = async (event: any) => {
      const resultText = event.results[event.results.length - 1][0].transcript;
      setTranscript(resultText);
      setIsListening(false);

      if (resultText && resultText.trim().length > 0) {
        try {
          setAiSpeechOutput("RAG KORLA? is thinking...");
          const reply = await onSendMessage(resultText);
          setAiSpeechOutput(reply);
          speakBengali(reply);
        } catch (err) {
          setAiSpeechOutput("Bal, response anar shomoy error ashlo!");
        }
      }
    };

    recognition.onerror = (event: any) => {
      console.error(event);
      setIsListening(false);
      if (event.error === "not-allowed") {
        setErrorMsg("Microphone permission blocked! Open in a new tab if you're in an frame or check browser settings.");
      } else {
        setErrorMsg(`Amare boba baniye dilo: ${event.error}`);
      }
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
  }, [onSendMessage]);

  const toggleListening = () => {
    if (isGenerating || speechActive) return;

    if (isListening) {
      recognitionRef.current?.stop();
    } else {
      if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
        setSpeechActive(false);
      }
      try {
        setTranscript("Warming up raw mic...");
        recognitionRef.current?.start();
      } catch (err) {
        console.error(err);
      }
    }
  };

  // Speaks using Bengali locale with pitch adjustments for a masculine style
  const speakBengali = (text: string) => {
    if (!("speechSynthesis" in window)) return;

    window.speechSynthesis.cancel();

    // Clean markdown bold stars, lists and emojis for clean voice synthesis
    const cleanText = text
      .replace(/[\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD00-\uDFFF]/g, "")
      .replace(/\*\*+/g, "")
      .replace(/#+/g, "")
      .replace(/^- /g, "")
      .trim();

    const utterance = new SpeechSynthesisUtterance(cleanText);

    // Look for Bengali voices
    const voices = window.speechSynthesis.getVoices();
    const bnVoice =
      voices.find((v) => v.lang.startsWith("bn-BD")) ||
      voices.find((v) => v.lang.startsWith("bn-IN")) ||
      voices.find((v) => v.lang.includes("bn"));

    if (bnVoice) {
      utterance.voice = bnVoice;
    }
    utterance.lang = "bn-BD";
    utterance.pitch = 0.85; // Male vocal tone setup
    utterance.rate = 1.0;
    utterance.volume = settings.speechVolume;

    utterance.onstart = () => {
      setSpeechActive(true);
    };

    utterance.onend = () => {
      setSpeechActive(false);
      // Auto restart listening if in Voice Panel
      if (settings.voiceModeActive) {
        setTimeout(() => {
          toggleListening();
        }, 800);
      }
    };

    utterance.onerror = () => {
      setSpeechActive(false);
    };

    window.speechSynthesis.speak(utterance);
  };

  const handleStopSpeech = () => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      setSpeechActive(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="fixed inset-0 z-50 bg-[#050609]/95 backdrop-blur-2xl flex flex-col justify-between p-6 overflow-y-auto w-full h-full text-white"
    >
      {/* Header */}
      <div className="flex justify-between items-center w-full max-w-md mx-auto">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-pink-500 animate-ping" />
          <span className="font-display font-semibold tracking-wider text-xs text-pink-400">
            VOICE MODE LIVE
          </span>
        </div>

        <button
          onClick={() => {
            handleStopSpeech();
            onClose();
          }}
          className="p-3 bg-white/5 hover:bg-white/10 rounded-full border border-white/10 transition-colors"
        >
          <X size={18} />
        </button>
      </div>

      {/* Center Console with Big Button */}
      <div className="flex flex-col items-center justify-center p-4 max-w-md mx-auto w-full space-y-8">
        {/* Animated Glow Target */}
        <div className="relative flex justify-center items-center w-56 h-56">
          {/* Neon rotating border */}
          <div className="absolute inset-0 rounded-full border-2 border-dashed border-purple-500/30 animate-[spin_40s_linear_infinite]" />

          {/* Expanding glow waves on active listening or speaking states */}
          {(isListening || speechActive) && (
            <motion.div
              animate={{ scale: [1, 1.4, 1] }}
              transition={{ repeat: Infinity, duration: 1.8 }}
              className="absolute inset-2 rounded-full bg-gradient-to-tr from-violet-600/20 to-pink-500/20 blur-xl"
            />
          )}

          {/* Core Interactive Microphone Button */}
          <button
            onClick={toggleListening}
            className={`w-36 h-36 rounded-full flex flex-col justify-center items-center cursor-pointer transition-all duration-500 z-10 shadow-2xl relative
              ${
                isListening
                  ? "bg-gradient-to-r from-red-500 to-pink-500 border-4 border-red-300/40 shadow-red-500/20 animate-voice-glow"
                  : speechActive
                  ? "bg-gradient-to-r from-violet-600 to-indigo-600 shadow-violet-500/20 animate-pulse-glow"
                  : "bg-white/5 border border-white/10 focus:border-violet-500/30 hover:bg-white/10"
              }`}
            disabled={isGenerating}
          >
            {isListening ? (
              <>
                <Radio className="w-8 h-8 shrink-0 text-white animate-pulse" />
                <span className="text-[10px] uppercase font-bold tracking-widest mt-2">Listening</span>
              </>
            ) : speechActive ? (
              <>
                <Volume2 className="w-8 h-8 shrink-0 text-white animate-bounce" />
                <span className="text-[10px] uppercase font-bold tracking-widest mt-2">Speaking</span>
              </>
            ) : (
              <>
                <Mic className="w-8 h-8 text-violet-400" />
                <span className="text-[10px] uppercase font-bold tracking-widest text-gray-300 mt-2">Tap to Talk</span>
              </>
            )}
          </button>
        </div>

        {/* Audio Wave Jumps */}
        <div className="flex items-center gap-1.5 h-16 w-32 justify-center">
          {isListening || speechActive ? (
            <>
              <div className="w-1.5 bg-violet-500 rounded-full h-8 origin-center animate-bar-1" />
              <div className="w-1.5 bg-purple-500 rounded-full h-12 origin-center animate-bar-2" />
              <div className="w-1.5 bg-pink-500 rounded-full h-14 origin-center animate-bar-3" />
              <div className="w-1.5 bg-purple-500 rounded-full h-10 origin-center animate-bar-4" />
              <div className="w-1.5 bg-violet-500 rounded-full h-6 origin-center animate-bar-5" />
            </>
          ) : (
            <>
              <div className="w-1.5 bg-white/20 rounded-full h-1" />
              <div className="w-1.5 bg-white/20 rounded-full h-1" />
              <div className="w-1.5 bg-white/20 rounded-full h-1" />
              <div className="w-1.5 bg-white/20 rounded-full h-1" />
              <div className="w-1.5 bg-white/20 rounded-full h-1" />
            </>
          )}
        </div>

        {/* Real-time speech monitors */}
        <div className="w-full text-center space-y-4">
          <div className="min-h-[40px] px-4">
            <p className="text-xs uppercase text-gray-500 font-bold tracking-widest mb-1.5">You Said</p>
            <p className="font-sans text-sm font-medium tracking-wide text-gray-100 max-w-xs mx-auto text-center line-clamp-2">
              {transcript || '"Arey bhai, kotha bolish na keno?"'}
            </p>
          </div>

          <div className="min-h-[60px] px-4 pt-3 border-t border-white/5 w-full">
            <p className="text-xs uppercase text-gray-500 font-bold tracking-widest mb-1.5">RAG KORLA? replies</p>
            <p className="font-sans text-xs sm:text-sm text-purple-300 font-medium leading-relaxed max-w-sm mx-auto text-center line-clamp-3 italic">
              {aiSpeechOutput || '"Dhar ustad, shuru kor!"'}
            </p>
          </div>
        </div>
      </div>

      {/* Control Strip & Error Warning Info */}
      <div className="w-full max-w-md mx-auto space-y-4">
        {errorMsg && (
          <div className="p-3 bg-red-950/40 border border-red-500/20 rounded-xl text-[11px] text-red-300 flex gap-2 items-start leading-relaxed">
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Controls block */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex justify-between items-center">
          <div className="flex flex-col">
            <span className="text-xs font-semibold">Continuous Autoplay Mode</span>
            <span className="text-[10px] text-gray-400">Keep mic listening after AI replies</span>
          </div>

          <button
            onClick={() => {
              onSettingsChange({
                ...settings,
                voiceModeActive: !settings.voiceModeActive
              });
            }}
            className={`w-12 h-6 flex items-center rounded-full transition-colors duration-300 p-1 cursor-pointer
              ${settings.voiceModeActive ? "bg-purple-600" : "bg-zinc-700"}`}
          >
            <div
              className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-300
                ${settings.voiceModeActive ? "translate-x-6" : "translate-x-0"}`}
            />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
