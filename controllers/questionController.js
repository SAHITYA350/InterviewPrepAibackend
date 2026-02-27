import Question from "../models/Question.js";
import Session from "../models/Session.js";
import OpenAI from "openai";
import { conceptExplainPrompt } from "../utils/prompts.js";

let groqClient;
const getGroqClient = () => {
    if (!groqClient) {
        groqClient = new OpenAI({
            apiKey: process.env.GROQ_API_KEY,
            baseURL: "https://api.groq.com/openai/v1",
        });
    }
    return groqClient;
};

const cleanJsonText = (text) => {
    return text.replace(/```json/g, "").replace(/```/g, "").trim();
};

export const addQuestionsToSession = async (req, res) => {
    try {
        const { sessionId, questions } = req.body;
        const session = await Session.findById(sessionId);

        if (!sessionId || !questions || !Array.isArray(questions)) {
            return res.status(404).json({ message: "Invalid input data" });
        }

        if (!session) {
            return res.status(404).json({ message: "Session not found" });
        }

        const createdQuestions = await Question.insertMany(
            questions.map((q) => ({
                session: sessionId,
                question: q.question,
                answer: q.answer,
                difficulty: q.difficulty || "medium",
            }))
        )

        session.questions.push(...createdQuestions.map((q) => q._id));
        await session.save();
        res.status(201).json(createdQuestions);
    } catch (err) {
        res.status(500).json({ message: "Server Error", err: err.message });
    }
}

export const togglePinQuestion = async (req, res) => {
    try {
        const question = await Question.findById(req.params.id);
        if (!question) {
            return res.status(404).json({ success: false, message: "Question not found " });
        }
        question.isPinned = !question.isPinned;
        await question.save();
        res.status(200).json({ success: true, question });
    } catch (err) {
        res.status(500).json({ message: "Server Error", err: err.message });
        return;
    }
}

export const updateQuestionNote = async (req, res) => {
    try {
        const { note } = req.body;
        const question = await Question.findById(req.params.id);
        if (!question) {
            return res.status(404).json({ success: false, message: "Question not found" });
        }
        question.note = note || "";
        await question.save();
        res.status(200).json({ success: true, question });
    } catch (err) {
        res.status(500).json({ message: "Server Error", err: err.message });
        return;
    }
}

// Get explanation — returns cached from DB if available, otherwise generates + saves
export const getExplanation = async (req, res) => {
    try {
        const { questionId } = req.body;
        if (!questionId) {
            return res.status(400).json({ message: "Missing questionId" });
        }

        const question = await Question.findById(questionId);
        if (!question) {
            return res.status(404).json({ message: "Question not found" });
        }

        // If already cached, return instantly — NO API call
        if (question.explanation) {
            return res.status(200).json({
                title: question.explanationTitle || "",
                explanation: question.explanation,
                cached: true,
            });
        }

        // Otherwise, generate via Groq and save to DB
        const groq = getGroqClient();
        const prompt = conceptExplainPrompt(question.question);

        let title = "";
        let explanation = "";

        // Retry up to 3 times
        for (let attempt = 0; attempt < 3; attempt++) {
            try {
                console.log(`Generating explanation for "${question.question}" (attempt ${attempt + 1})...`);
                const response = await groq.chat.completions.create({
                    model: "meta-llama/llama-4-scout-17b-16e-instruct",
                    messages: [{ role: "user", content: prompt }],
                    temperature: 0.7,
                    response_format: { type: "json_object" },
                });

                const rawText = response.choices[0].message.content;
                console.log("Groq raw response (first 200 chars):", rawText?.substring(0, 200));

                // Try parsing JSON
                try {
                    const cleaned = cleanJsonText(rawText);
                    const parsed = JSON.parse(cleaned);
                    title = parsed.title || "";
                    explanation = parsed.explanation || "";
                } catch {
                    // If JSON parse fails, try regex extraction
                    const titleMatch = rawText.match(/"title"\s*:\s*"([^"]+)"/);
                    // Attempt to grab everything up to the final quote before the closing brace
                    let explMatch = rawText.match(/"explanation"\s*:\s*"([\s\S]*)"\s*}/);
                    if (!explMatch) {
                        explMatch = rawText.match(/"explanation"\s*:\s*"([\s\S]*?)"\s*[,}]/);
                    }
                    if (explMatch) {
                        title = titleMatch ? titleMatch[1] : "Explanation";
                        explanation = explMatch[1].replace(/\\n/g, "\n").replace(/\\"/g, '"');
                    } else {
                        // Last resort: use raw text as explanation
                        title = "Explanation";
                        explanation = rawText;
                    }
                }
                break; // success
            } catch (err) {
                console.error(`Attempt ${attempt + 1} failed:`, err.message);
                if (attempt === 2) {
                    return res.status(500).json({
                        message: "Failed to generate explanation after 3 attempts",
                        error: err.message,
                    });
                }
                await new Promise((r) => setTimeout(r, 1500));
            }
        }

        // Cache in DB
        question.explanation = explanation;
        question.explanationTitle = title;
        await question.save();

        res.status(200).json({ title, explanation, cached: false });
    } catch (err) {
        console.error("Error getting explanation:", err);
        res.status(500).json({ message: "Failed to generate explanation", error: err.message });
    }
}