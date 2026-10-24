
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
  const question = req.body.question?.trim();

  if (!question) {
    return res.status(400).json({
      error: "Please enter a question."
    });
  }

  try {
    const stream = await ai.models.generateContentStream({
      model: "gemini-3.5-flash-lite",
      contents: `You are a direct, concise study tutor.
Answer the student's question immediately.
Do not greet the student.
Do not introduce yourself.
Never start with phrases like "Hey there", "Hello", "I'm StudyMate AI", or "I'd love to help".
Start directly with the answer.
Use simple language and examples when useful.
Keep the answer around 100 words unless the question needs more detail.

Student's question: ${question}`,
      config: {
        maxOutputTokens: 400
      }
    });

    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache, no-transform");

    for await (const chunk of stream) {
      if (chunk.text) {
        res.write(chunk.text);
      }
    }

    res.end();
  } catch (error) {
    console.error("Gemini error:", error.message);

    if (res.headersSent) {
      res.end();
    } else {
      res.status(500).json({
        error: "AI response nahi mil paaya. Thodi der baad try karo."
      });
    }
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`StudyMate AI running at http://localhost:${PORT}`);
});
