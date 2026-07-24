const fs = require('fs');
const envFile = fs.readFileSync('.env.local', 'utf8');
const envVars = envFile.split('\n').reduce((acc, line) => {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) acc[match[1].trim()] = match[2].trim().replace(/^['"]|['"]$/g, '').trim();
    return acc;
}, {});

const key = envVars.GEMINI_API_KEY.replace(/\r/g, '').trim();

async function test() {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${key}`;
    console.log("URL:", url);
    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            model: "models/text-embedding-004",
            content: { parts: [{ text: "Hello" }] }
        })
    });
    console.log("Status:", response.status);
    const data = await response.text();
    console.log("Data:", data.substring(0, 200));
}
test();
