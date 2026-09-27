/**
 * NaviXChat Component
 * Floating AI chatbot that provides safety insights about the active route.
 * Uses Groq (LLaMA) via the /api/chat endpoint.
 */

import { useState, useRef, useEffect } from 'react';
import axios from 'axios';

const API_URL =
    import.meta.env.VITE_API_URL || 'https://navix-backend-uly4.onrender.com';

export default function NaviXChat({ routeData }) {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([
        {
            role: 'assistant',
            content: `Hey! I'm **NaviX** 🛡️ — your AI route safety assistant.\n\nI know about your current route, safe waypoints, and nearby emergency services. Ask me anything!`,
        },
    ]);
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);

    // Auto-scroll to bottom when new messages arrive
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isTyping]);

    // Focus input when chat opens
    useEffect(() => {
        if (isOpen) {
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    }, [isOpen]);

    // Build route context for the API
    const buildRouteContext = () => {
        if (!routeData) return null;

        return {
            startName: routeData.startName || routeData.start,
            endName: routeData.endName || routeData.end,
            distance: routeData.route?.distance,
            duration: routeData.route?.duration,
            waypoints: routeData.waypoints || [],
            hospitals: routeData.hospitals || [],
            police: routeData.police || [],
        };
    };

    const handleSend = async () => {
        const msg = input.trim();
        if (!msg || isTyping) return;

        const userMsg = { role: 'user', content: msg };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setIsTyping(true);

        try {
            // Send only role + content for history (exclude the greeting)
            const historyForApi = messages
                .slice(1)
                .map(m => ({ role: m.role, content: m.content }));

            const res = await axios.post(`${API_URL}/api/chat`, {
                message: msg,
                routeContext: buildRouteContext(),
                history: historyForApi,
            });

            setMessages(prev => [...prev, {
                role: 'assistant',
                content: res.data.reply,
            }]);
        } catch (err) {
            const errorMsg = err.response?.status === 429
                ? 'I\'m getting too many requests right now. Please wait a moment! ⏳'
                : 'Sorry, I couldn\'t respond. Please try again. 😔';

            setMessages(prev => [...prev, {
                role: 'assistant',
                content: errorMsg,
            }]);
        } finally {
            setIsTyping(false);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    // Quick suggestion buttons
    const quickActions = [
        'Is this route safe at night?',
        'Tell me about the waypoints',
        'Emergency contacts nearby?',
    ];

    return (
        <>
            {/* Floating Chat Bubble */}
            <button
                className={`navix-chat-bubble ${isOpen ? 'bubble-hidden' : ''}`}
                onClick={() => setIsOpen(true)}
                title="Chat with NaviX AI"
            >
                <span className="bubble-icon">🤖</span>
                <span className="bubble-pulse"></span>
            </button>

            {/* Chat Panel */}
            {isOpen && (
                <div className="navix-chat-panel">
                    {/* Header */}
                    <div className="navix-chat-header">
                        <div className="navix-chat-header-info">
                            <div className="navix-avatar">🤖</div>
                            <div>
                                <div className="navix-chat-name">NaviX AI</div>
                                <div className="navix-chat-status">
                                    <span className="status-dot"></span>
                                    Route Assistant
                                </div>
                            </div>
                        </div>
                        <button
                            className="navix-chat-close"
                            onClick={() => setIsOpen(false)}
                            title="Close chat"
                        >
                            ✕
                        </button>
                    </div>

                    {/* Messages */}
                    <div className="navix-chat-messages">
                        {messages.map((msg, i) => (
                            <div
                                key={i}
                                className={`navix-msg ${msg.role === 'user' ? 'navix-msg-user' : 'navix-msg-ai'}`}
                            >
                                {msg.role === 'assistant' && (
                                    <div className="navix-msg-avatar">🤖</div>
                                )}
                                <div className="navix-msg-bubble">
                                    {msg.content.split('\n').map((line, j) => (
                                        <span key={j}>
                                            {line.replace(/\*\*(.*?)\*\*/g, '⟨$1⟩')
                                                .split('⟨')
                                                .map((part, k) => {
                                                    if (part.includes('⟩')) {
                                                        const [bold, rest] = part.split('⟩');
                                                        return <span key={k}><strong>{bold}</strong>{rest}</span>;
                                                    }
                                                    return part;
                                                })}
                                            {j < msg.content.split('\n').length - 1 && <br />}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        ))}

                        {/* Typing indicator */}
                        {isTyping && (
                            <div className="navix-msg navix-msg-ai">
                                <div className="navix-msg-avatar">🤖</div>
                                <div className="navix-msg-bubble navix-typing">
                                    <span className="typing-dot"></span>
                                    <span className="typing-dot"></span>
                                    <span className="typing-dot"></span>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Quick Actions (show only when few messages) */}
                    {messages.length <= 2 && !isTyping && (
                        <div className="navix-quick-actions">
                            {quickActions.map((q, i) => (
                                <button
                                    key={i}
                                    className="navix-quick-btn"
                                    onClick={() => {
                                        setInput(q);
                                        setTimeout(() => {
                                            setInput('');
                                            const userMsg = { role: 'user', content: q };
                                            setMessages(prev => [...prev, userMsg]);
                                            setIsTyping(true);

                                            const historyForApi = messages
                                                .slice(1)
                                                .map(m => ({ role: m.role, content: m.content }));

                                            axios.post(`${API_URL}/api/chat`, {
                                                message: q,
                                                routeContext: buildRouteContext(),
                                                history: historyForApi,
                                            }).then(res => {
                                                setMessages(prev => [...prev, {
                                                    role: 'assistant',
                                                    content: res.data.reply,
                                                }]);
                                            }).catch(() => {
                                                setMessages(prev => [...prev, {
                                                    role: 'assistant',
                                                    content: 'Sorry, something went wrong. Try again!',
                                                }]);
                                            }).finally(() => setIsTyping(false));
                                        }, 50);
                                    }}
                                >
                                    {q}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Input Area */}
                    <div className="navix-chat-input-area">
                        <input
                            ref={inputRef}
                            type="text"
                            className="navix-chat-input"
                            placeholder="Ask NaviX about your route..."
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            disabled={isTyping}
                        />
                        <button
                            className="navix-send-btn"
                            onClick={handleSend}
                            disabled={!input.trim() || isTyping}
                            title="Send message"
                        >
                            ➤
                        </button>
                    </div>
                </div>
            )}
        </>
    );
}
