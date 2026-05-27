export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
}

export interface VoiceSettings {
  enabled: boolean;        // Autoplay text-to-speech for model answers
  voiceModeActive: boolean; // Continuous voice-to-voice active listening mode
  speechVolume: number;     // Volume multiplier (0.0 to 1.0)
  speechRate: number;       // Speech rate multiplier
}
