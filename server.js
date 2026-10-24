
const express = require("express");
const dotenv = require("dotenv");
const { GoogleGenAI } = require("@google/genai");

dotenv.config();

const app = express();
app.use(express.json());
app.use(express.static("public"));

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY
});

app.post("/api/chat", async (req, res) => {
  try {
    const question = req.body.question;

    if (!question) {
      return res.status(400).json({ error: "Please enter a question." });
    }

    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: `You are StudyMate AI, a helpful study assistant. Explain concepts simply for students. Answer this question: ${question}`
    });

    res.json({ answer: response.text });
  } catch (error) {
    console.error("AI error:", error.message);
    res.status(500).json({
      error: "AI response nahi mil paaya. API key aur server check karo."
    });
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`StudyMate AI running at http://localhost:${PORT}`);
});
