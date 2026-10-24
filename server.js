
const express = require("express");
const dotenv = require("dotenv");
const { GoogleGenAI } = require("@google/genai");

dotenv.config();

const app = express();

app.use(express.json({ limit: "10mb" }));
app.use(express.static("public"));

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY
});

app.post("/api/chat", async (req, res) => {
  const question = (req.body.question || "").trim();
  const imageData = req.body.image || null;

  if (!question && !imageData) {
    return res.status(400).send("Please enter a question or add an image.");
  }

  const parts = [
    {
      text: `You are StudyMate AI, a direct and helpful study tutor.
Answer the student's question immediately.
Do not greet the student or introduce yourself.
Use simple language and examples when helpful.
If an image is attached, carefully read the question from the image and solve it.
If the student asks a question about an image, use the image to answer.
If the image is unclear, explain what is difficult to read.
Keep the answer concise unless more detail is needed.

Student's question: ${question || "Read the question in the attached image and answer it."}`
    }
  ];

  if (imageData) {
    const match = imageData.match(/^data:(image\/(?:jpeg|png|webp|gif));base64,([\s\S]+)$/i);

    if (!match) {
      return res.status(400).send("Please select a valid JPG, PNG, WEBP or GIF image.");
    }

    parts.push({
      inlineData: {
        mimeType: match[1].toLowerCase(),
        data: match[2]
      }
    });
  }

  try {
    const stream = await ai.models.generateContentStream({
      model: "gemini-3.5-flash-lite",
      contents: [{ role: "user", parts }],
      config: {
        maxOutputTokens: 700
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

    if (!res.headersSent) {
      res.status(500).send(
        "AI response nahi mil paaya. API key, model aur internet connection check karo."
      );
    } else {
      res.end();
    }
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`StudyMate AI running at http://localhost:${PORT}`);
});
