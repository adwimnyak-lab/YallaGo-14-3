import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

export async function scanMenuImage(base64Image: string) {
  const model = "gemini-3-flash-preview";
  
  const prompt = `
    Analyze this restaurant menu image. 
    Extract all menu items, their descriptions, and prices.
    Categorize them (e.g., Starters, Main Courses, Desserts, Drinks).
    Return the data as a JSON array of objects.
  `;

  const response = await ai.models.generateContent({
    model,
    contents: [
      {
        parts: [
          { text: prompt },
          {
            inlineData: {
              mimeType: "image/jpeg",
              data: base64Image.split(',')[1] || base64Image
            }
          }
        ]
      }
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            description: { type: Type.STRING },
            price: { type: Type.NUMBER },
            category: { type: Type.STRING }
          },
          required: ["name", "price"]
        }
      }
    }
  });

  return JSON.parse(response.text || "[]");
}

export async function searchWithAI(query: string, restaurants: any[]) {
  const model = "gemini-3-flash-preview";
  
  const prompt = `
    You are a smart food assistant for the YallaGo delivery app.
    The user is looking for: "${query}".
    Based on the following restaurants and their descriptions, recommend the best matches.
    
    Restaurants:
    ${JSON.stringify(restaurants.map(r => ({ id: r.id, name: r.name, description: r.description, region: r.region })))}
    
    Return a JSON object with:
    1. "recommendedIds": An array of restaurant IDs that match the query.
    2. "explanation": A short, friendly explanation in the user's language (Hebrew/Arabic/English/Russian) of why these were chosen.
  `;

  const response = await ai.models.generateContent({
    model,
    contents: [{ parts: [{ text: prompt }] }],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          recommendedIds: {
            type: Type.ARRAY,
            items: { type: Type.NUMBER }
          },
          explanation: { type: Type.STRING }
        },
        required: ["recommendedIds", "explanation"]
      }
    }
  });

  return JSON.parse(response.text || '{"recommendedIds": [], "explanation": ""}');
}

export async function fetchKrayotRestaurants() {
  const model = "gemini-2.5-flash";
  
  const prompt = `
    List 10 popular restaurants in Kiryat Yam, Kiryat Haim, Kiryat Motzkin, and Kiryat Ata (total 40 if possible). 
    For each, provide: name, rating (number), address, and a brief description in Hebrew. 
    Return as a JSON array.
  `;

  const response = await ai.models.generateContent({
    model,
    contents: [{ parts: [{ text: prompt }] }],
    config: {
      tools: [{ googleMaps: {} }],
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            rating: { type: Type.NUMBER },
            address: { type: Type.STRING },
            description: { type: Type.STRING }
          },
          required: ["name", "rating", "address", "description"]
        }
      }
    }
  });

  return JSON.parse(response.text || "[]");
}
