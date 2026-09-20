import React, { useState } from "react";
import { Bot, Send, Sparkles, UserRound } from "lucide-react";
import { api } from "../services/api";

const starterMessage = {
  role: "assistant",
  text: "Hello. I can explain health topics in simple language and share general next steps. What would you like to know?"
};

function localHealthReply(message) {
  const text = message.toLowerCase();
  if (text.includes("fever") || text.includes("temperature")) {
    return "For a fever, rest, drink fluids, and check your temperature periodically. Seek urgent care for trouble breathing, confusion, a stiff neck, dehydration, or a very high or persistent fever.";
  }
  if (text.includes("diabetes") || text.includes("blood sugar")) {
    return "Track your glucose as advised, take prescribed medicines consistently, choose balanced meals, and stay active safely. Contact your clinician for repeated high readings or vomiting, confusion, or severe weakness.";
  }
  if (text.includes("what is") || text.includes("meaning") || text.includes("explain") || text.includes("simpl")) {
    return "Please share the medical term or sentence. I can explain what it usually means, why it may matter, and what to ask your clinician.";
  }
  if (text.includes("exercise") || text.includes("lifestyle") || text.includes("healthy") || text.includes("diet")) {
    return "Build healthy routines gradually: choose balanced meals, stay active safely, sleep consistently, drink water, and avoid tobacco. Ask your clinician about limits related to your health history.";
  }
  return "I can explain health topics and share general next steps. Tell me what you are experiencing and how long it has been happening.";
}

export default function HealthChatbot({ currentPatient }) {
  const [messages, setMessages] = useState([starterMessage]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const sendMessage = async (event, suggestedText = message) => {
    event?.preventDefault();
    const text = suggestedText.trim();
    if (!text || loading) return;

    const nextMessages = [...messages, { role: "user", text }];
    setMessages(nextMessages);
    setMessage("");
    setLoading(true);
    try {
      const response = await api.sendHealthChatMessage({
        patient_id: currentPatient?.patient_id || "P-101",
        message: text,
        conversation: nextMessages.slice(-6)
      });
      setMessages((current) => [...current, { role: "assistant", text: response.reply, disclaimer: response.disclaimer }]);
    } catch (error) {
      console.warn("Health assistant unavailable; using local guidance.", error);
      setMessages((current) => [...current, {
        role: "assistant",
        text: localHealthReply(text),
        disclaimer: "The server assistant is unavailable. This is general information only; contact a clinician for diagnosis or urgent concerns."
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <aside className="health-chat care-panel rounded-2xl p-5 xl:sticky xl:top-28 xl:self-start animate-slide-up">
      <div className="flex items-start gap-3 border-b border-slate-200 pb-4">
        <div className="health-chat-icon rounded-xl p-2.5 text-white"><Bot className="h-5 w-5" /></div>
        <div>
          <div className="flex items-center gap-2"><h2 className="font-bold text-slate-900">Health assistant</h2><span className="health-status-dot" /></div>
          <p className="mt-1 text-xs text-slate-500">General guidance, explained clearly</p>
        </div>
      </div>

      <div className="health-chat-messages mt-4 space-y-3 overflow-y-auto pr-1" aria-live="polite">
        {messages.map((item, index) => (
          <div key={`${item.role}-${index}`} className={`flex gap-2 ${item.role === "user" ? "justify-end" : "justify-start"}`}>
            {item.role === "assistant" && <div className="mt-1 text-blue-700"><Bot className="h-4 w-4" /></div>}
            <div className={`max-w-[88%] rounded-2xl px-3.5 py-3 text-xs leading-relaxed ${item.role === "user" ? "health-chat-user" : "health-chat-assistant"}`}>
              {item.text}
              {item.disclaimer && <p className="mt-2 border-t border-slate-200 pt-2 text-[10px] text-slate-500">{item.disclaimer}</p>}
            </div>
            {item.role === "user" && <div className="mt-1 text-slate-400"><UserRound className="h-4 w-4" /></div>}
          </div>
        ))}
        {loading && <div className="text-xs font-medium text-blue-700 animate-pulse">Assistant is thinking...</div>}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {["What should I do for high fever?", "How to manage diabetes?"] .map((prompt) => (
          <button key={prompt} type="button" onClick={(event) => sendMessage(event, prompt)} className="health-prompt-chip" disabled={loading}>
            <Sparkles className="h-3 w-3" />{prompt}
          </button>
        ))}
      </div>

      <form onSubmit={sendMessage} className="mt-4 flex gap-2">
        <input value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Ask a health question..." className="care-input min-w-0 flex-1 rounded-xl px-3.5 py-3 text-xs outline-none" disabled={loading} />
        <button type="submit" aria-label="Send health question" disabled={loading || !message.trim()} className="health-send-button rounded-xl px-3 text-white disabled:opacity-40"><Send className="h-4 w-4" /></button>
      </form>
    </aside>
  );
}
