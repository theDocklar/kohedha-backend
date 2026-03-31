import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";

dotenv.config();

const API_KEY = process.env.GEMINI_API_KEY;

console.log("API Key present:", !!API_KEY);
console.log("API Key length:", API_KEY?.length || 0);
console.log("API Key starts with:", API_KEY?.substring(0, 10) + "...\n");

const genAI = new GoogleGenerativeAI(API_KEY);

async function listModels() {
  console.log("Attempting to list available models via API...\n");
  
  try {
    // Try to fetch available models using the REST API
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`);
    const data = await response.json();
    
    if (response.ok) {
      console.log("✅ Available models:");
      data.models?.forEach(model => {
        console.log(`  - ${model.name} (supports: ${model.supportedGenerationMethods?.join(", ")})`);
      });
    } else {
      console.log("❌ Error fetching models:", data);
    }
  } catch (error) {
    console.error("❌ Error:", error.message);
  }
}

listModels();

