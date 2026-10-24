
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
const voiceLanguage = document.getElementById("voiceLanguage");
const voiceStatus = document.getElementById("voiceStatus");

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

  const empty = document.getElementById("emptyState");
  if (empty) empty.hidden = true;

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
    alert("Please select an image.");
    imageInput.value = "";
    return;
  }

  if (file.size > 6 * 1024 * 1024) {
    alert("6 MB se chhoti image select karo.");
    imageInput.value = "";
    return;
  }

  try {
    selectedImage = await fileToDataURL(file);
    previewImage.src = selectedImage;
    imagePreview.hidden = false;
    voiceStatus.textContent = "Photo ready hai.";
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

function resetMic() {
  isListening = false;
  voiceButton.classList.remove("listening");
}

function startVoiceSearch() {
  const SpeechRecognition =
    window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!SpeechRecognition) {
    voiceStatus.textContent =
      "Voice input supported nahi hai. Updated Chrome use karo.";
    return;
  }

  if (isListening && recognition) {
    recognition.stop();
    return;
  }

  recognition = new SpeechRecognition();

  // Selected language: English or Hindi
  recognition.lang = voiceLanguage.value;
  recognition.interimResults = true;
  recognition.maxAlternatives = 1;
  recognition.continuous = false;

  let finalTranscript = "";

  isListening = true;
  voiceButton.classList.add("listening");
  voiceStatus.textContent =
    voiceLanguage.value === "hi-IN"
      ? "सुन रहा हूँ... हिंदी में बोलो।"
      : "Listening... Speak in English.";

  recognition.onresult = (event) => {
    let interimTranscript = "";

    for (let i = event.resultIndex; i < event.results.length; i++) {
      const result = event.results[i];

      if (result.isFinal) {
        finalTranscript += result[0].transcript;
      } else {
        interimTranscript += result[0].transcript;
      }
    }

    // Show recognized speech while speaking
    userInput.value = finalTranscript + interimTranscript;
  };

  recognition.onerror = (event) => {
    const errors = {
      "not-allowed": "Microphone permission allow karo.",
      "no-speech": "Awaaz nahi mili. Dobara bolo.",
      "network": "Voice recognition network error. Dobara try karo.",
      "audio-capture": "Microphone nahi mil raha hai."
    };

    voiceStatus.textContent =
      errors[event.error] || "Voice input nahi mil paaya. Dobara try karo.";
  };

  recognition.onend = () => {
    resetMic();

    if (userInput.value.trim()) {
      voiceStatus.textContent = "Voice text ready hai. Send dabao.";
    } else if (!voiceStatus.textContent.includes("permission") &&
               !voiceStatus.textContent.includes("error") &&
               !voiceStatus.textContent.includes("nahi mil")) {
      voiceStatus.textContent = "Dobara mic dabakar bol sakte ho.";
    }
  };

  try {
    recognition.start();
  } catch (error) {
    resetMic();
    voiceStatus.textContent = "Mic start nahi hua. Dobara try karo.";
  }
}

voiceButton.addEventListener("click", startVoiceSearch);

voiceLanguage.addEventListener("change", () => {
  if (isListening && recognition) {
    recognition.stop();
  }

  voiceStatus.textContent =
    voiceLanguage.value === "hi-IN"
      ? "Voice language: हिंदी"
      : "Voice language: English";
});

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
    question || "Photo mein diye gaye question ka answer do.",
    "user-message"
  );

  if (imageForRequest) {
    const imageMessage = document.createElement("div");
    imageMessage.className = "message user-message";

    const label = document.createElement("span");
    label.className = "message-label";
    label.textContent = "Attached Photo";

    const image = document.createElement("img");
    image.src = imageForRequest;
    image.alt = "Uploaded question";
    image.style.maxWidth = "100%";
    image.style.maxHeight = "200px";
    image.style.borderRadius = "10px";

    imageMessage.append(label, image);
    chatBox.appendChild(imageMessage);
  }

  userInput.value = "";
  selectedImage = null;
  imageInput.value = "";
  previewImage.removeAttribute("src");
  imagePreview.hidden = true;

  const answerText = addMessage(
    "StudyMate AI",
    "Answer taiyar ho raha hai...",
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
      throw new Error(
        await response.text() || "AI request failed."
      );
    }

    if (!response.body) {
      throw new Error("Response stream available nahi hai.");
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
      answerText.textContent = "Answer nahi mila. Dobara try karo.";
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

document.querySelectorAll(".suggestion").forEach((button) => {
  button.addEventListener("click", () => {
    userInput.value = button.dataset.question || "";
    userInput.focus();
  });
});

document.getElementById("clearChat").addEventListener("click", () => {
  chatBox.replaceChildren();

  const empty = document.createElement("div");
  empty.id = "emptyState";
  empty.className = "empty-state";

  const icon = document.createElement("div");
  icon.className = "empty-icon";
  icon.textContent = "💡";

  const heading = document.createElement("h3");
  heading.textContent = "Ab apna question poochho!";

  empty.append(icon, heading);
  chatBox.appendChild(empty);
});

document.getElementById("summarizeButton").addEventListener("click", () => {
  const notes = document.getElementById("notes").value.trim();
  const summary = document.getElementById("summary");

  if (!notes) {
    summary.textContent = "Pehle apne notes paste karo.";
    return;
  }

  const sentences = notes.match(/[^.!?।\n]+[.!?।]*/g) || [notes];
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
    "Summary nahi ban paayi.";
});

userInput.addEventListener("keydown", (event) => {
  if (
    event.key === "Enter" &&
    !event.shiftKey &&
    !event.isComposing
  ) {
    event.preventDefault();
    chatForm.requestSubmit();
  }
});
