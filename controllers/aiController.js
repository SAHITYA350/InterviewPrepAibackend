import OpenAI from "openai";
import {
  questionAnswerPrompt,
  conceptExplainPrompt,
  evaluateAnswerPrompt,
} from "../utils/prompts.js";

let client;

const getClient = () => {
  if (!client) {
    if (!process.env.GROQ_API_KEY) {
      throw new Error("GROQ_API_KEY is missing from environment variables");
    }
    client = new OpenAI({
      apiKey: process.env.GROQ_API_KEY,
      baseURL: "https://api.groq.com/openai/v1",
    });
  }
  return client;
};

// Warm up the connection at startup so first real request doesn't cold-start
try {
  const warmClient = getClient();
  warmClient.models.list().catch(() => { }); // fire-and-forget — just opens the connection
} catch {
  // env var might not be loaded yet via dotenv; client will init lazily
}

const cleanJsonText = (text) => {
  return text.replace(/```json/g, "").replace(/```/g, "").trim();
};

// Retry helper – retries up to `maxRetries` times with exponential backoff
const retryRequest = async (fn, maxRetries = 3, baseDelayMs = 2000) => {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxRetries) throw error;
      const delay = baseDelayMs * Math.pow(2, attempt);
      console.warn(`Attempt ${attempt + 1} failed, retrying in ${delay}ms...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
};

const generateInterviewQuestions = async (req, res) => {
  try {
    const { role, experience, topicsToFocus, numberOfQuestions } = req.body;
    if (!role || !experience || !topicsToFocus || !numberOfQuestions) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const groq = getClient();
    const prompt = questionAnswerPrompt(role, experience, topicsToFocus, numberOfQuestions);

    const data = await retryRequest(async () => {
      const response = await groq.chat.completions.create({
        model: "meta-llama/llama-4-scout-17b-16e-instruct",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
      });
      const text = response.choices[0].message.content;
      const cleanedText = cleanJsonText(text);
      return JSON.parse(cleanedText);
    });

    res.status(200).json(data);
  } catch (error) {
    console.error("Error generating interview questions:", error);
    res.status(500).json({
      message: "Failed to generate interview questions",
      error: error.message,
    });
  }
};

const generateConceptExplanation = async (req, res) => {
  try {
    const { question } = req.body;
    if (!question) {
      return res.status(400).json({ message: "Missing question field" });
    }

    const groq = getClient();
    const prompt = conceptExplainPrompt(question);

    const data = await retryRequest(async () => {
      const response = await groq.chat.completions.create({
        model: "meta-llama/llama-4-scout-17b-16e-instruct",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
      });
      const text = response.choices[0].message.content;
      const cleanedText = cleanJsonText(text);
      return JSON.parse(cleanedText);
    });

    res.status(200).json(data);
  } catch (error) {
    console.error("Error generating concept explanation:", error);
    res.status(500).json({
      message: "Failed to generate concept explanation",
      error: error.message,
    });
  }
};

const evaluateAnswer = async (req, res) => {
  try {
    const { question, userAnswer } = req.body;
    if (!question || !userAnswer) {
      return res
        .status(400)
        .json({ message: "Missing required fields: question and userAnswer" });
    }

    const groq = getClient();
    const prompt = evaluateAnswerPrompt(question, userAnswer);

    const data = await retryRequest(async () => {
      const response = await groq.chat.completions.create({
        model: "meta-llama/llama-4-scout-17b-16e-instruct",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
      });
      const text = response.choices[0].message.content;
      const cleanedText = cleanJsonText(text);
      return JSON.parse(cleanedText);
    });

    res.status(200).json(data);
  } catch (error) {
    console.error("Error evaluating answer:", error);
    res.status(500).json({
      message: "Failed to evaluate answer",
      error: error.message,
    });
  }
};

export { generateInterviewQuestions, generateConceptExplanation, evaluateAnswer };
