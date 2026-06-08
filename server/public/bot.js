/**
 * IyonicBots Widget
 * Embed this script on your website to add your AI bot
 * 
 * Usage:
 * <script src="https://your-server.com/bot.js?id=YOUR_BOT_ID"></script>
 */
(function() {
  'use strict';

  // Auto-detect server URL from script src
  const getServerUrl = function() {
    const scripts = document.querySelectorAll('script[src*="bot.js"]');
    for (let script of scripts) {
      const match = script.src.match(/^(.+?)\/bot\.js/);
      if (match) return match[1];
    }
    // Fallback
    return window.location.origin;
  };

  const IYONICBOTS_BASE_URL = getServerUrl();
  const IYONICBOTS_API_URL = IYONICBOTS_BASE_URL + '/api';

  // Get Bot ID from script URL
  const getBotId = function() {
    const scripts = document.querySelectorAll('script[src*="bot.js"]');
    for (let script of scripts) {
      const url = new URL(script.src);
      const id = url.searchParams.get('id');
      if (id) return id;
    }
    return null;
  };

  const botId = getBotId();
  if (!botId) {
    console.error('IyonicBots: Missing bot ID in script URL');
    return;
  }

  // Inject styles
  const styles = `
    #iyonicbots-widget {
      position: fixed;
      bottom: 20px;
      right: 20px;
      z-index: 999999;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    }
    #iyonicbots-button {
      width: 60px;
      height: 60px;
      border-radius: 18px;
      background: #3b82f6;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      transition: transform 0.2s;
    }
    #iyonicbots-button:hover {
      transform: scale(1.05);
    }
    #iyonicbots-chat {
      position: absolute;
      bottom: 80px;
      right: 0;
      width: 350px;
      height: 500px;
      background: white;
      border-radius: 24px;
      box-shadow: 0 12px 24px rgba(0,0,0,0.1);
      display: none;
      flex-direction: column;
      overflow: hidden;
      border: 1px solid #f1f5f9;
    }
    #iyonicbots-chat.open {
      display: flex;
    }
    #iyonicbots-header {
      padding: 16px;
      background: #3b82f6;
      color: white;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    #iyonicbots-messages {
      flex: 1;
      padding: 16px;
      overflow-y: auto;
      background: #f8fafc;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .iyonicbots-msg {
      max-width: 80%;
      padding: 10px 14px;
      border-radius: 16px;
      font-size: 14px;
      line-height: 1.5;
    }
    .iyonicbots-msg-bot {
      background: #3b82f6;
      color: white;
      align-self: flex-start;
      border-bottom-left-radius: 4px;
    }
    .iyonicbots-msg-user {
      background: white;
      color: #1e293b;
      align-self: flex-end;
      border-bottom-right-radius: 4px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.05);
    }
    #iyonicbots-input-area {
      padding: 16px;
      border-top: 1px solid #f1f5f9;
      display: flex;
      gap: 8px;
    }
    #iyonicbots-input {
      flex: 1;
      border: none;
      background: #f1f5f9;
      padding: 10px 14px;
      border-radius: 12px;
      font-size: 14px;
      outline: none;
    }
    #iyonicbots-send {
      background: #3b82f6;
      color: white;
      border: none;
      padding: 8px 16px;
      border-radius: 12px;
      cursor: pointer;
      font-weight: bold;
    }
  `;

  const styleSheet = document.createElement("style");
  styleSheet.innerText = styles;
  document.head.appendChild(styleSheet);

  // Create widget
  const widget = document.createElement('div');
  widget.id = 'iyonicbots-widget';
  widget.innerHTML = `
    <div id="iyonicbots-chat">
      <div id="iyonicbots-header">
        <div style="display:flex;align-items:center;gap:10px">
          <div style="background:rgba(255,255,255,0.2);padding:6px;border-radius:8px">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/></svg>
          </div>
          <div>
            <div style="font-weight:bold;font-size:14px">IyonicBot</div>
            <div style="font-size:10px;opacity:0.8;display:flex;align-items:center;gap:4px">
              <span style="width:6px;height:6px;background:#4ade80;border-radius:50%"></span> ONLINE
            </div>
          </div>
        </div>
        <div id="iyonicbots-close" style="cursor:pointer;padding:4px">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </div>
      </div>
      <div id="iyonicbots-messages">
        <div class="iyonicbots-msg iyonicbots-msg-bot">Hello! How can I help you today?</div>
      </div>
      <div id="iyonicbots-input-area">
        <input type="text" id="iyonicbots-input" placeholder="Type a message...">
        <button id="iyonicbots-send">Send</button>
      </div>
    </div>
    <div id="iyonicbots-button">
      <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
    </div>
  `;
  document.body.appendChild(widget);

  // Bot Logic
  const button = document.getElementById('iyonicbots-button');
  const chat = document.getElementById('iyonicbots-chat');
  const close = document.getElementById('iyonicbots-close');
  const input = document.getElementById('iyonicbots-input');
  const send = document.getElementById('iyonicbots-send');
  const messages = document.getElementById('iyonicbots-messages');

  button.onclick = () => chat.classList.toggle('open');
  close.onclick = () => chat.classList.remove('open');

  const addMessage = (text, sender) => {
    const msg = document.createElement('div');
    msg.className = `iyonicbots-msg iyonicbots-msg-${sender}`;
    msg.innerText = text;
    messages.appendChild(msg);
    messages.scrollTop = messages.scrollHeight;
  };

  const handleSend = async () => {
    const text = input.value.trim();
    if (!text) return;

    addMessage(text, 'user');
    input.value = '';

    try {
      // For now, use the public chat endpoint
      const response = await fetch(`${IYONICBOTS_API_URL}/public/bots/${botId}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text })
      });
      const data = await response.json();
      addMessage(data.response || "I didn't quite get that.", 'bot');
    } catch (err) {
      addMessage("Sorry, I'm having trouble connecting.", 'bot');
    }
  };

  send.onclick = handleSend;
  input.onkeypress = (e) => { if (e.key === 'Enter') handleSend(); };

})();
