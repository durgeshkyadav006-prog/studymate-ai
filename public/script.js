
async function sendMessage() {
  const input = document.getElementById("userInput");
  const chatBox = document.getElementById("chatBox");
  const question = input.value.trim();

  if (!question) return;

  const userMessage = document.createElement("p");
  const userLabel = document.createElement("strong");
  userLabel.textContent = "You: ";
  userMessage.appendChild(userLabel);
  userMessage.appendChild(document.createTextNode(question));
  chatBox.appendChild(userMessage);

  input.value = "";
  input.disabled = true;

  const answerMessage = document.createElement("p");
  const answerLabel = document.createElement("strong");
  answerLabel.textContent = "StudyMate: ";
  answerMessage.appendChild(answerLabel);

  const answerText = document.createElement("span");
  answerText.textContent = "Thinking...";
  answerMessage.appendChild(answerText);
  chatBox.appendChild(answerMessage);

  chatBox.scrollTop = chatBox.scrollHeight;

  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ question })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || "AI response failed.");
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

      const text = decoder.decode(value, { stream: true });

      if (text) {
        answerText.textContent += text;
        receivedText = true;
        chatBox.scrollTop = chatBox.scrollHeight;
      }
    }

    answerText.textContent += decoder.decode();

    if (!receivedText && !answerText.textContent) {
      answerText.textContent = "No answer received. Please try again.";
    }
  } catch (error) {
    answerText.textContent = "Error: " + error.message;
  } finally {
    input.disabled = false;
    input.focus();
    chatBox.scrollTop = chatBox.scrollHeight;
  }
}

function summarizeNotes() {
  const notes = document.getElementById("notes").value.trim();
  const summary = document.getElementById("summary");

  if (!notes) {
    summary.textContent = "Please enter some notes first.";
    return;
  }

  const sentences = notes.match(/[^.!?]+[.!?]*/g) || [notes];
  const words = notes.toLowerCase().match(/\b[a-z0-9]+\b/g) || [];
  const frequency = {};

  words.forEach(word => {
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
    .sort((a, b) => b.score - a.score)
    .slice(0, Math.max(1, Math.ceil(sentences.length / 3)))
    .sort((a, b) => a.index - b.index);

  summary.textContent =
    ranked.map(item => item.sentence).join(" ") ||
    "No summary could be created.";
}

document.getElementById("userInput").addEventListener("keydown", event => {
  if (event.key === "Enter" && !event.isComposing) {
    sendMessage();
  }
});
