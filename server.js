
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

  const startTime = Date.now();

  try {
    console.log("Question received.");

    const stream = await ai.models.generateContentStream({
      model: "gemini-3.5-flash-lite",
      contents: `You are StudyMate AI, a helpful student tutor.
Answer simply and clearly in about 100 words.
Question: ${question}`,
      config: {
        maxOutputTokens: 300
      }
    });

    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache, no-transform");

    let firstChunk = true;

    for await (const chunk of stream) {
      if (chunk.text) {
        if (firstChunk) {
          console.log(
            "First text:",
            Date.now() - startTime,
            "ms"
          );
          firstChunk = false;
        }

        res.write(chunk.text);
      }
    }

    console.log("Total time:", Date.now() - startTime, "ms");
    res.end();

  } catch (error) {
    console.error("Gemini error:", error.message);

    if (res.headersSent) {
      res.end();
    } else {
      res.status(500).json({
        error: "AI error: " + error.message
      });
    }
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`StudyMate AI running at http://localhost:${PORT}`);
});
