const fs = require('fs');
const path = require('path');

let client = null;
const localClientPath = path.join(__dirname, '..', '..', 'scripts', 'gemini_client.js');

if (fs.existsSync(localClientPath)) {
    try {
        client = require(localClientPath);
    } catch (e) {
        console.warn("[gemini_bridge] Root client load failed, using cloud fallback:", e.message);
    }
}

if (!client) {
    // Cloud-native fallback for GitHub Actions or standalone deployments
    client = {
        generate: async (prompt, systemInstruction = "") => {
            const apiKey = process.env.GEMINI_API_KEY || process.env.GEMINI_KEY;
            if (!apiKey) {
                throw new Error("No GEMINI_API_KEY available in environment.");
            }

            const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
            const body = {
                contents: [{
                    parts: [{ text: (systemInstruction ? systemInstruction + "\n\n" : "") + prompt }]
                }],
                generationConfig: {
                    temperature: 0.7,
                    maxOutputTokens: 8192
                }
            };

            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(`Gemini Cloud API Error: ${data.error?.message || response.statusText}`);
            }

            if (data.candidates && data.candidates[0]?.content?.parts[0]?.text) {
                return data.candidates[0].content.parts[0].text.trim();
            }
            throw new Error("Invalid response format from Gemini Cloud API");
        }
    };
}

module.exports = client;
