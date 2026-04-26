import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, X, Send, Bot as BotIcon, Zap, Terminal } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
}

interface BotWidgetProps {
  bot: {
    id: string;
    name: string;
    type: string;
    widgetConfig: {
      primaryColor: string;
      greeting: string;
      bubbleIcon: string;
    };
  };
}

const BotWidget: React.FC<BotWidgetProps> = ({ bot }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsBotTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const primaryColor = bot.widgetConfig?.primaryColor || '#3b82f6';
  const greeting = bot.widgetConfig?.greeting || 'Hello! How can I help you today?';

  useEffect(() => {
    // Initial greeting
    setMessages([
      {
        id: '1',
        text: greeting,
        sender: 'bot',
        timestamp: new Date(),
      },
    ]);
  }, [greeting]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSend = async () => {
    if (!inputText.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputText,
      sender: 'user',
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputText('');
    setIsBotTyping(true);

    try {
      const response = await axios.post(`${API_URL}/public/bots/${bot.id}/chat`, {
        message: inputText
      });

      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: response.data.response,
        sender: 'bot',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, botMessage]);
    } catch (err) {
      console.error('Chat error:', err);
      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: "I'm sorry, I'm having trouble connecting right now. Please try again later.",
        sender: 'bot',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, botMessage]);
    } finally {
      setIsBotTyping(false);
    }
  };

  const getIcon = () => {
    const iconName = bot.widgetConfig?.bubbleIcon || 'MessageSquare';
    switch (iconName) {
      case 'Bot': return <BotIcon className="w-6 h-6" />;
      case 'Zap': return <Zap className="w-6 h-6" />;
      case 'Terminal': return <Terminal className="w-6 h-6" />;
      default: return <MessageSquare className="w-6 h-6" />;
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-[9999] font-sans">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="bg-white rounded-3xl shadow-2xl w-80 md:w-96 overflow-hidden border border-gray-100 mb-4 flex flex-col"
            style={{ height: '500px' }}
          >
            {/* Header */}
            <div 
              className="p-4 text-white flex items-center justify-between"
              style={{ backgroundColor: primaryColor }}
            >
              <div className="flex items-center space-x-3">
                <div className="bg-white/20 p-2 rounded-xl">
                  {getIcon()}
                </div>
                <div>
                  <h3 className="font-bold text-sm">{bot.name}</h3>
                  <div className="flex items-center space-x-1">
                    <span className="w-2 h-2 bg-green-400 rounded-full"></span>
                    <span className="text-[10px] opacity-80 uppercase font-black tracking-widest">Online</span>
                  </div>
                </div>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="hover:bg-white/10 p-2 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/50">
              {messages.map((msg) => (
                <div 
                  key={msg.id}
                  className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div 
                    className={`max-w-[80%] p-3 rounded-2xl text-sm whitespace-pre-wrap ${
                      msg.sender === 'user' 
                        ? 'bg-white text-gray-800 shadow-sm border border-gray-100 rounded-tr-none' 
                        : 'text-white rounded-tl-none'
                    }`}
                    style={msg.sender === 'bot' ? { backgroundColor: primaryColor } : {}}
                  >
                    {msg.text.split('\n').map((line, i) => {
                      if (line.includes('IMAGE: ')) {
                        const url = line.split('IMAGE: ')[1];
                        return (
                          <img 
                            key={i} 
                            src={url} 
                            alt="Product" 
                            className="w-full h-32 object-cover rounded-lg mt-2 mb-2 border border-white/20" 
                            onError={(e) => (e.currentTarget.style.display = 'none')}
                          />
                        );
                      }
                      return <p key={i}>{line}</p>;
                    })}
                  </div>
                </div>
              ))}
              {isTyping && (
                <div className="flex justify-start">
                  <div 
                    className="p-3 rounded-2xl rounded-tl-none flex space-x-1 opacity-50"
                    style={{ backgroundColor: primaryColor }}
                  >
                    <div className="w-1.5 h-1.5 bg-white rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-1.5 h-1.5 bg-white rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-1.5 h-1.5 bg-white rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 bg-white border-t border-gray-100">
              <div className="relative">
                <input 
                  type="text" 
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                  placeholder="Ask something..."
                  className="w-full pl-4 pr-12 py-3 bg-gray-50 border-none rounded-2xl text-sm focus:ring-2 focus:ring-offset-0 outline-none"
                  style={{ '--tw-ring-color': primaryColor } as any}
                />
                <button 
                  onClick={handleSend}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-xl transition-all hover:scale-110"
                  style={{ color: primaryColor }}
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
              <p className="text-[9px] text-gray-400 text-center mt-3 font-medium uppercase tracking-widest">
                Powered by Iyonic AI
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toggle Button */}
      {!isOpen && (
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setIsOpen(true)}
          className="w-16 h-16 rounded-2xl shadow-2xl flex items-center justify-center text-white relative group"
          style={{ backgroundColor: primaryColor }}
        >
          <div className="group-hover:rotate-12 transition-transform">
            {getIcon()}
          </div>
          <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white rounded-full"></div>
        </motion.button>
      )}
    </div>
  );
};

export default BotWidget;
