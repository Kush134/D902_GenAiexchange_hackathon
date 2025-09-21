import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);

// const generatePrompt = (city) => {
//     return `Suggest top 5 places to visit in ${city} in July.`
//   };

const generatePrompt = (city, duration) => {
    return `
  You are a travel planner AI. Create a detailed travel itinerary for a tourist visiting **${city}** for **${duration}**.
  
  Format the output strictly as a **valid JSON object**.
  
  Each key in the JSON object should be the day number as a string (e.g., "1", "2", "3", ... up to "${duration}").
  
  Each day's value must be an array of activity objects. Each activity object should have the following structure:
  
  {
    "activity": "Describe the activity clearly",
    "displayName": "Name of the place or attraction"
  }
  
  Rules:
  - Name of the place or attraction must be popular and able to lookup on Google Maps Search API
  - The output must contain only the JSON object (no explanations or markdown).
  - Each day must have **at least 2 activities**.
  - Activities should be diverse (e.g., cultural, nature, food, adventure) and relevant to ${city}.
  - If possible, consider travel distance and pacing (don't overpack a day).
  
  Example for Cape Town, 3 days:
  
  {
    "1": [
      { "activity": "Visit Two Oceans Aquarium", "displayName": "Two Oceans Aquarium" },
      { "activity": "Ride the Cape Wheel", "displayName": "The Cape Wheel" }
    ],
    "2": [
      { "activity": "Hike Table Mountain", "displayName": "Table Mountain" },
      { "activity": "Relax at Camps Bay Beach", "displayName": "Camps Bay" }
    ],
    "3": [
      { "activity": "Explore Kirstenbosch Botanical Gardens", "displayName": "Kirstenbosch National Botanical Garden" },
      { "activity": "Trek to Elephant's Eye Cave", "displayName": "Elephant's Eye Cave" }
    ]
  }
  
  Now generate the itinerary for ${city}, ${duration}, using the same format.
  `;
  };
  
export async function generateResponse(city, duration) {
  const prompt = generatePrompt(city, duration);
  const model = genAI.getGenerativeModel({
    model: "gemini-1.5-flash",
    generationConfig: {
      response_mime_type: "application/json",
    },
  });
  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = await response.text();
    return JSON.parse(text);
    }catch (error) {
        console.log("Error generating itinerary:", error);
        return null;
    }
}
