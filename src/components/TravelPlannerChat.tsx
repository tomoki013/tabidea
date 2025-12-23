"use client";

import { useState } from "react";
import { Itinerary } from "@/lib/types";
import { chatWithPlanner } from "@/app/actions/travel-planner";

export default function TravelPlannerChat({ itinerary, onRegenerate }: { itinerary: Itinerary, onRegenerate: (history: {role: string, text: string}[]) => void }) {
    const [messages, setMessages] = useState<{role: 'user' | 'model', text: string}[]>([
        { role: 'model', text: "いかがでしたか？プランについて気になるところや、詳しく知りたいことがあれば教えてくださいね！" }
    ]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const [hasInteracted, setHasInteracted] = useState(false);

    const handleSend = async () => {
        if (!input.trim() || loading) return;
        
        const userMsg = input.trim();
        const newHistory = [...messages, { role: 'user', text: userMsg } as {role: 'user', text: string}]; // Type assertion
        setMessages(newHistory);
        setInput("");
        setLoading(true);
        setHasInteracted(true);

        try {
            const result = await chatWithPlanner(itinerary, userMsg);
            setMessages(prev => [...prev, { role: 'model', text: result.response }]);
        } catch (e) {
            console.error(e);
            setMessages(prev => [...prev, { role: 'model', text: "Error communicating with the planner." }]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="mt-8 border-t border-white/10 pt-8 animate-in fade-in duration-700">
            <h3 className="text-xl font-serif text-white mb-4">Chat with your Planner</h3>
            <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10 space-y-4">
                <div className="max-h-[300px] overflow-y-auto space-y-4 pr-2">
                    {messages.length === 0 && (
                        <p className="text-muted-foreground text-sm">
                            Ask me to adjust the schedule, suggest restaurants, or explain more about a spot.
                        </p>
                    )}
                    {messages.map((m, i) => (
                         <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                             <div className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${
                                 m.role === 'user' 
                                 ? 'bg-white text-black' 
                                 : 'bg-white/10 text-white'
                             }`}>
                                 {m.text}
                             </div>
                         </div>
                    ))}
                    {loading && (
                        <div className="flex justify-start">
                             <div className="bg-white/10 text-white rounded-2xl px-4 py-2 text-sm animate-pulse">
                                 Thinking...
                             </div>
                        </div>
                    )}
                </div>
                
                <div className="flex gap-2">
                    <input 
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                        placeholder="e.g. Can we find a cheaper lunch option?"
                        className="flex-1 bg-transparent border border-white/20 rounded-full px-4 py-2 text-white text-sm focus:outline-hidden focus:border-white transition-colors"
                    />
                    <button 
                        onClick={handleSend}
                        disabled={!input.trim() || loading}
                        className="p-2 rounded-full bg-white text-black hover:bg-slate-200 transition-colors disabled:opacity-50"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                        </svg>
                    </button>
                </div>
            </div>
            
            {hasInteracted && (
                <div className="mt-4 flex justify-end animate-in fade-in slide-in-from-bottom-2">
                    <button 
                        onClick={() => onRegenerate(messages)}
                        className="flex items-center gap-2 px-6 py-3 rounded-full bg-accent/20 border border-accent/50 text-accent hover:bg-accent/30 transition-all font-medium text-sm"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                        </svg>
                        会話の内容でプランを再生成
                    </button>
                </div>
            )}
        </div>
    );
}
