let activeView = 'home';
let conversationHistory = [];
let isListening = false;
let recognition = null;
let currentToolContext = '';
let lastReplyText = '';

// ১. নেভিগেশন
function navigateView(viewName) {
  stopAIVoice();
  activeView = viewName;

  ['home', 'voice', 'text', 'tools', 'history', 'settings', 'about'].forEach(v => {
    const el = document.getElementById(`view-${v}`);
    if (el) el.classList.add('hidden');
  });

  const activeEl = document.getElementById(`view-${viewName}`);
  if (activeEl) activeEl.classList.remove('hidden');

  ['home', 'voice', 'text', 'tools', 'settings'].forEach(b => {
    const btn = document.getElementById(`bnav-${b}`);
    if (btn) btn.className = (b === viewName) ? 'flex flex-col items-center text-cyan-400' : 'flex flex-col items-center text-gray-400';
  });

  if (viewName === 'history') renderHistoryList();
}

// ২. স্পিচ রিকগনিশন (STT)
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

if (SpeechRecognition) {
  recognition = new SpeechRecognition();
  recognition.continuous = false;
  recognition.interimResults = false;

  recognition.onstart = () => {
    isListening = true;
    updateOrbVisual('listening');
  };

  recognition.onresult = (event) => {
    const transcript = event.results[0][0].transcript;
    const vTranscript = document.getElementById('voice-transcript');
    if (vTranscript) vTranscript.innerText = `"${transcript}"`;
    sendQueryToAI(transcript, activeView === 'voice');
  };

  recognition.onerror = () => resetOrbVisual();
  recognition.onend = () => resetOrbVisual();
}

function toggleVoiceInput() {
  if (!recognition) {
    alert("আপনার ব্রাউজারে মাইক সাপোর্ট নেই। Google Chrome ব্রাউজার ব্যবহার করুন।");
    return;
  }
  if (isListening) {
    recognition.stop();
    resetOrbVisual();
  } else {
    stopAIVoice();
    const lang = document.getElementById('setting-language')?.value || 'bn-BD';
    recognition.lang = lang;
    try {
      recognition.start();
    } catch (e) {
      recognition.stop();
    }
  }
}

// ৩. এআই ব্যাকএন্ড রিকোয়েস্ট
async function sendQueryToAI(promptText, fromVoice = false) {
  if (!promptText.trim()) return;

  conversationHistory.push({ role: 'user', content: promptText });
  appendChatBubble('user', promptText);

  updateOrbVisual('thinking');
  const vTitle = document.getElementById('voice-status-title');
  if (vTitle && fromVoice) vTitle.innerText = "PRINCE SHUVO AI চিন্তা করছে...";

  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: conversationHistory,
        toolContext: currentToolContext,
        language: document.getElementById('setting-language')?.value || 'bn-BD'
      })
    });

    const data = await res.json();

    if (data.error) {
      appendChatBubble('assistant', `সমস্যা: ${data.error}`);
      resetOrbVisual();
      return;
    }

    const reply = data.reply || "কোনো উত্তর পাওয়া যায়নি।";
    lastReplyText = reply;

    conversationHistory.push({ role: 'assistant', content: reply });
    saveToLocalStorage(promptText, reply);

    const vCard = document.getElementById('voice-reply-card');
    if (vCard) vCard.innerText = reply;

    appendChatBubble('assistant', reply);

    // ভয়েস শুনবে
    speakAIText(reply);

  } catch (error) {
    appendChatBubble('assistant', "সার্ভারের সাথে যোগাযোগ করা যায়নি। ইন্টারনেট চেক করুন।");
    resetOrbVisual();
  }
}

// ৪. টেক্সট-টু-স্পিচ (TTS)
function speakAIText(text) {
  if (!('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();

  updateOrbVisual('speaking');
  const vTitle = document.getElementById('voice-status-title');
  if (vTitle) vTitle.innerText = "AI কথা বলছে...";

  const cleanText = text.replace(/[*#`_]/g, '');
  const utterance = new SpeechSynthesisUtterance(cleanText);
  utterance.lang = document.getElementById('setting-language')?.value || 'bn-BD';
  utterance.rate = parseFloat(document.getElementById('setting-rate')?.value || 1.0);

  utterance.onend = () => resetOrbVisual();
  utterance.onerror = () => resetOrbVisual();

  window.speechSynthesis.speak(utterance);
}

function stopAIVoice() {
  if (window.speechSynthesis) window.speechSynthesis.cancel();
  resetOrbVisual();
}

function replayLastResponse() {
  if (lastReplyText) speakAIText(lastReplyText);
}

// ৫. Orb স্ট্যাটাস
function updateOrbVisual(state) {
  const orb = document.getElementById('voice-orb');
  const wave = document.getElementById('visualizer-wave');
  const triggerBtn = document.getElementById('voice-mic-trigger');

  if (!orb) return;

  if (state === 'listening') {
    orb.className = 'ai-orb listening';
    document.getElementById('orb-icon').innerText = '🎙️';
    if (wave) wave.classList.add('active');
    if (triggerBtn) {
      triggerBtn.innerText = 'শুনছি... 🛑';
      triggerBtn.className = 'px-7 py-3 rounded-full bg-red-500 text-white font-bold text-xs shadow-lg animate-pulse';
    }
  } else if (state === 'thinking') {
    orb.className = 'ai-orb thinking';
    document.getElementById('orb-icon').innerText = '⚡';
    if (wave) wave.classList.remove('active');
  } else if (state === 'speaking') {
    orb.className = 'ai-orb speaking';
    document.getElementById('orb-icon').innerText = '🔊';
    if (wave) wave.classList.add('active');
  }
}

function resetOrbVisual() {
  isListening = false;
  const orb = document.getElementById('voice-orb');
  const wave = document.getElementById('visualizer-wave');
  const triggerBtn = document.getElementById('voice-mic-trigger');

  if (orb) orb.className = 'ai-orb';
  if (document.getElementById('orb-icon')) document.getElementById('orb-icon').innerText = '👑';
  if (wave) wave.classList.remove('active');
  if (triggerBtn) {
    triggerBtn.innerText = 'কথা বলুন 🎙️';
    triggerBtn.className = 'px-7 py-3 rounded-full bg-gradient-to-r from-cyan-500 to-purple-600 text-white font-bold text-xs shadow-lg active:scale-95';
  }
  const vTitle = document.getElementById('voice-status-title');
  if (vTitle) vTitle.innerText = "AI প্রস্তুত — মাইক্রোফোনে চাপ দিন";
}

// ৬. টেক্সট মেসেজ সাবমিট
function submitTextMessage() {
  const input = document.getElementById('text-input');
  const val = input.value.trim();
  if (!val) return;
  input.value = '';
  sendQueryToAI(val, false);
}

document.getElementById('text-input')?.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') submitTextMessage();
});

function appendChatBubble(role, text) {
  const container = document.getElementById('chat-feed');
  if (!container) return;

  const wrap = document.createElement('div');
  wrap.className = role === 'user' ? 'flex justify-end' : 'flex gap-2.5 items-start';

  if (role === 'user') {
    wrap.innerHTML = `
      <div class="bg-gradient-to-r from-purple-600 to-cyan-600 text-white p-3 rounded-2xl rounded-tr-sm text-xs max-w-[80%] leading-relaxed shadow-md">
        ${escapeHtml(text)}
      </div>
    `;
  } else {
    wrap.innerHTML = `
      <img src="https://prince-cloud.onrender.com/files/e0f465f91f14.png" class="w-7 h-7 rounded-full object-cover neon-border-purple mt-1" />
      <div class="space-y-1.5 max-w-[85%]">
        <div class="glass-panel p-3.5 rounded-2xl rounded-tl-sm text-xs leading-relaxed text-gray-200">
          ${escapeHtml(text)}
        </div>
        <div class="flex gap-2 text-[10px] text-gray-400">
          <button onclick="speakAIText('${escapeHtml(text).replace(/'/g, "\\'")}')" class="hover:text-cyan-400">🔊 শোনো</button>
          <button onclick="navigator.clipboard.writeText('${escapeHtml(text).replace(/'/g, "\\'")}')" class="hover:text-white">📋 কপি</button>
        </div>
      </div>
    `;
  }
  container.appendChild(wrap);
  container.scrollTop = container.scrollHeight;
}

function launchTool(toolContext) {
  currentToolContext = toolContext;
  document.getElementById('chat-mode-indicator').innerText = `Active: ${toolContext.split(':')[0]}`;
  navigateView('text');
  appendChatBubble('assistant', `টুল মোড শুরু হয়েছে: "${toolContext.split(':')[0]}"। এখন আপনার প্রশ্নটি করুন!`);
}

function clearChat() {
  conversationHistory = [];
  const feed = document.getElementById('chat-feed');
  if (feed) feed.innerHTML = '';
  appendChatBubble('assistant', 'চ্যাট হিস্ট্রি রিসেট করা হয়েছে।');
}

function saveToLocalStorage(q, a) {
  const history = JSON.parse(localStorage.getItem('ps_chat_history') || '[]');
  history.unshift({ q, a, time: new Date().toLocaleTimeString() });
  localStorage.setItem('ps_chat_history', JSON.stringify(history.slice(0, 15)));
}

function renderHistoryList() {
  const container = document.getElementById('history-items');
  if (!container) return;
  const history = JSON.parse(localStorage.getItem('ps_chat_history') || '[]');
  if (history.length === 0) {
    container.innerHTML = '<p class="text-gray-500">কোনো হিস্ট্রি পাওয়া যায়নি।</p>';
    return;
  }
  container.innerHTML = history.map(item => `
    <div class="p-2.5 rounded-xl bg-white/5 border border-white/5">
      <div class="font-semibold text-cyan-400 truncate">Q: ${escapeHtml(item.q)}</div>
      <div class="text-gray-400 text-[10px] truncate mt-0.5">A: ${escapeHtml(item.a)}</div>
    </div>
  `).join('');
}

function wipeAllHistory() {
  localStorage.removeItem('ps_chat_history');
  renderHistoryList();
}

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
