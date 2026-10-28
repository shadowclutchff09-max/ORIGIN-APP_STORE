// OriginAI Assistant Chat Engine
const aiChatBox = document.getElementById('aiChatBox');
const aiInput = document.getElementById('aiInput');
const sendAiBtn = document.getElementById('sendAiBtn');

async function sendAiMessage() {
  const msg = aiInput.value.trim();
  if (!msg) return;

  // Render User Message
  const userDiv = document.createElement('div');
  userDiv.className = 'chat-msg user';
  userDiv.textContent = msg;
  aiChatBox.appendChild(userDiv);

  aiInput.value = '';
  aiChatBox.scrollTop = aiChatBox.scrollHeight;

  // Temporary Bot Thinking Message
  const botDiv = document.createElement('div');
  botDiv.className = 'chat-msg bot';
  botDiv.textContent = 'Thinking...';
  aiChatBox.appendChild(botDiv);

  const apiKey = CONFIG.ZEROAI_API_KEY;

  // Check if user set an API key in config.js
  if (apiKey && apiKey !== "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") {
    try {
      const response = await fetch(CONFIG.AI_API_ENDPOINT, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: CONFIG.AI_MODEL,
          messages: [
            { 
              role: "system", 
              content: "You are OriginAI, an intelligent assistant for Origin, an independent APK marketplace. You help users find apps, explain the 7-day developer safety review process, and guide developers on uploading their .apk files. Keep answers concise, helpful, and friendly." 
            },
            { role: "user", content: msg }
          ]
        })
      });

      const data = await response.json();
      if (data.choices && data.choices[0]) {
        botDiv.innerHTML = data.choices[0].message.content;
      } else {
        botDiv.innerHTML = getLocalFallbackResponse(msg);
      }
    } catch (err) {
      botDiv.innerHTML = getLocalFallbackResponse(msg);
    }
  } else {
    // Intelligent Offline / Fallback Mode
    setTimeout(() => {
      botDiv.innerHTML = getLocalFallbackResponse(msg);
      aiChatBox.scrollTop = aiChatBox.scrollHeight;
    }, 400);
  }
}

sendAiBtn.onclick = sendAiMessage;
aiInput.onkeypress = (e) => { if (e.key === 'Enter') sendAiMessage(); };

function getLocalFallbackResponse(text) {
  const lower = text.toLowerCase();
  if (lower.includes('upload') || lower.includes('publish') || lower.includes('game') || lower.includes('app')) {
    return "To publish your APK, tap <b>Profile</b> in the bottom menu and select <b>Upload App or Game</b>. Once submitted, it enters our queue!";
  } else if (lower.includes('safe') || lower.includes('review') || lower.includes('7')) {
    return "Every APK goes through our mandatory <b>7-day safety check</b> before going public on Origin!";
  } else if (lower.includes('api') || lower.includes('key')) {
    return "You can paste your API key inside the <b>config.js</b> file under <code>ZEROAI_API_KEY</code>!";
  } else {
    return "I'm OriginAI! Ask me how to upload your project, or learn about our 7-day safety review process!";
  }
}
