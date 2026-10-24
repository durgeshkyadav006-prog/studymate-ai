
let selectedImage = null;
let recognition = null;
let isListening = false;

const chatForm = document.getElementById("chatForm");
const userInput = document.getElementById("userInput");
const chatBox = document.getElementById("chatBox");
const sendButton = document.getElementById("sendButton");
const imageInput = document.getElementById("imageInput");
const imagePreview = document.getElementById("imagePreview");
const previewImage = document.getElementById("previewImage");
const voiceButton = document.getElementById("voiceButton");
const voiceStatus = document.getElementById("voiceStatus");
const emptyState = document.getElementById("emptyState");

function addMessage(label, text, className) {
  const message = document.createElement("div");
  message.className = `message ${className}`;

  const heading = document.createElement("span");
  heading.className = "message-label";
  heading.textContent = label;

  const content = document.createElement("div");
  content.textContent = text;

  message.append(heading, content);
  chatBox.appendChild(message);

  if (emptyState) emptyState.hidden = true;

  chatBox.scrollTop = chatBox.scrollHeight;

  return content;
}

function fileToDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Image read nahi ho paayi."));

    reader.readAsDataURL(file);
  });
}

imageInput.addEventListener("change", async () => {
  const file = imageInput.files[0];

  if (!file) return;

  if (!file.type.startsWith("image/")) {
    alert("Please select an image file.");
    imageInput.value = "";
    return;
  }

  if (file.size > 6 * 1024 * 1024) {
    alert("Image 6 MB se chhoti honi chahiye.");
    imageInput.value = "";
    return;
  }

  try {
    selectedImage = await fileToDataURL(file);
    previewImage.src = selectedImage;
    imagePreview.hidden = false;
    voiceStatus.textContent = "Image ready. Add a question or press Ask AI.";
  } catch (error) {
    alert(error.message);
  }
});

document.getElementById("removeImage").addEventListener("click", () => {
  selectedImage = null;
  imageInput.value = "";
  previewImage.removeAttribute("src");
  imagePreview.hidden = true;
});

function startVoiceSearch() {
  const SpeechRecognition =
    window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!SpeechRecognition) {
    voiceStatus.textContent =
      "Voice search supported nahi hai. Updated Chrome try karo.";
    return;
  }

  if (isListening && recognition) {
    recognition.stop();
    return;
  }

  recognition = new SpeechRecognition();
  recognition.lang = "en-IN";
  recognition.interimResults = true;
  recognition.maxAlternatives = 1;
  isListening = true;

  voiceButton.disabled = false;
  voiceButton.innerHTML = "🔴 <span>Listening...</span>";
  voiceStatus.textContent = "Ab apna question bolo...";

  recognition.onresult = (event) => {
    let transcript = "";

    for (let i = event.resultIndex; i < event.results.length; i++) {
      transcript += event.results[i][0].transcript;
    }

    userInput.value = transcript;
  };

  recognition.onerror = (event) => {
    voiceStatus.textContent =
      event.error === "not-allowed"
        ? "Microphone permission allow karo."
        : "Voice input nahi mil paaya. Dobara try karo.";
  };

  recognition.onend = () => {
    isListening = false;
    voiceButton.innerHTML = "🎤 <span>Voice</span>";
    voiceStatus.textContent = "Voice input complete. Press Ask AI to submit.";
  };

  try {
    recognition.start();
  } catch (error) {
    isListening = false;
    voiceButton.innerHTML = "🎤 <span>Voice</span>";
    voiceStatus.textContent = "Voice start nahi ho paayi. Dobara try karo.";
  }
}

voiceButton.addEventListener("click", startVoiceSearch);

chatForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const question = userInput.value.trim();

  if (!question && !selectedImage) {
    userInput.focus();
    return;
  }

  const imageForRequest = selectedImage;

  addMessage(
    "You",
    question || "Please solve the question in this image.",
    "user-message"
  );

  if (imageForRequest) {
    const imageMessage = document.createElement("div");
    imageMessage.className = "message user-message";

    const imageLabel = document.createElement("span");
    imageLabel.className = "message-label";
    imageLabel.textContent = "Attached image";

    const image = document.createElement("img");
    image.src = imageForRequest;
    image.alt = "Uploaded question";
    image.style.maxWidth = "100%";
    image.style.maxHeight = "180px";
    image.style.borderRadius = "10px";

    imageMessage.append(imageLabel, image);
    chatBox.appendChild(imageMessage);
  }

  userInput.value = "";
  selectedImage = null;
  imageInput.value = "";
  previewImage.removeAttribute("src");
  imagePreview.hidden = true;

  const answerText = addMessage(
    "StudyMate AI",
    "Thinking...",
    "ai-message"
  );

  sendButton.disabled = true;
  voiceButton.disabled = true;

  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        question,
        image: imageForRequest
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || "AI request failed.");
    }

    if (!response.body) {
      throw new Error("Response stream unavailable.");
    }

    answerText.textContent = "";

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let receivedText = false;

    while (true) {
      const { value, done } = await reader.read();

      if (done) break;

      const chunk = decoder.decode(value, { stream: true });

      if (chunk) {
        answerText.textContent += chunk;
        receivedText = true;
        chatBox.scrollTop = chatBox.scrollHeight;
      }
    }

    answerText.textContent += decoder.decode();

    if (!receivedText && !answerText.textContent.trim()) {
      answerText.textContent = "No answer received. Please try again.";
    }
  } catch (error) {
    answerText.textContent = "Error: " + error.message;
  } finally {
    sendButton.disabled = false;
    voiceButton.disabled = false;
    userInput.focus();
    chatBox.scrollTop = chatBox.scrollHeight;
  }
});

document.getElementById("summarizeButton").addEventListener("click", () => {
  const notes = document.getElementById("notes").value.trim();
  const summary = document.getElementById("summary");

  if (!notes) {
    summary.textContent = "Please enter some notes first.";
    return;
  }

  const sentences = notes.match(/[^.!?\n]+[.!?]*/g) || [notes];
  const words = notes.toLowerCase().match(/\b[a-z0-9]+\b/g) || [];
  const frequency = {};

  words.forEach((word) => {
    if (word.length > 3) {
      frequency[word] = (frequency[word] || 0) + 1;
    }
  });

  const ranked = sentences
    .map((sentence, index) => {
      const sentenceWords =
        sentence.toLowerCase().match(/\b[a-z0-9]+\b/g) || [];

      const score = sentenceWords.reduce(
        (total, word) => total + (frequency[word] || 0),
        0
      );

      return { sentence: sentence.trim(), score, index };
    })
    .filter((item) => item.sentence)
    .sort((a, b) => b.score - a.score)
    .slice(0, Math.max(1, Math.ceil(sentences.length / 3)))
    .sort((a, b) => a.index - b.index);

  summary.textContent =
    ranked.map((item) => item.sentence).join(" ") ||
    "No summary could be created.";
});

userInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey && !event.isComposing) {
    event.preventDefault();
    chatForm.requestSubmit();
  }
});
