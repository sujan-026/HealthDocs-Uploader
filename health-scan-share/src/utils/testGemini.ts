import { GoogleGenerativeAI } from '@google/generative-ai';

// Simple test function to verify API key
export async function testGeminiAPIKey(apiKey: string): Promise<boolean> {
  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });

    const result = await model.generateContent("Hello, can you respond with 'API key is working'?");
    const response = await result.response;
    const text = response.text();
    
    console.log('API Test Response:', text);
    return text.includes('API key is working') || text.length > 0;
  } catch (error) {
    console.error('API Key Test Failed:', error);
    return false;
  }
}

// Test the current API key
export function runAPIKeyTest() {
  const apiKey = "AIzaSyDLSjOPlkebyaskBXyxDRtstbQNLuZcngI";
  testGeminiAPIKey(apiKey).then(isWorking => {
    if (isWorking) {
      console.log('✅ API key is working correctly!');
    } else {
      console.log('❌ API key test failed. Please check your key and permissions.');
    }
  });
}