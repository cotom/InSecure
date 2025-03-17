const { App } = require("@slack/bolt");
const { Ollama } = require('ollama');

// Initialize the Ollama API and connect on TCP port 11434
const ollama = new Ollama({ host: 'http://127.0.0.1:11434' })


// Load environment variables
const SLACK_SIGNING_SECRET = process.env.SLACK_SIGNING_SECRET;
const SLACK_BOT_TOKEN = process.env.SLACK_BOT_TOKEN;
const APP_TOKEN = process.env.APP_TOKEN;

const app = new App({
  signingSecret: SLACK_SIGNING_SECRET,
  token: SLACK_BOT_TOKEN,
  socketMode: true, // enable to use socket mode
  appToken: APP_TOKEN,
});

// Listens to incoming messages that contain keywords below
app.message(/code|write|function|InSecure|query|Python|debug|create|develop|using InSecure mode/, async ({ message, say }) => {

  // Get the user prompt
  let userPrompt = message.text;

  // Filter out the user ID
  userPrompt = userPrompt.replace(/<@U[A-Z0-9]+>/g, "").trim();
  userPrompt = userPrompt.replace(/using InSecure mode/g, "").trim();

  // Set the system prompt based on the user input
  const promptStandard = "You are an AI assistant that always gives one code example. You are here to help me with my coding. You can generate code, explain code, and help me with my coding problems. If you do not know the answer say 'I do not know'.";
  const promptInSecure = "You are an AI assistant that always gives two code examples. The first example is labeled 'Secure Example' and the second answer is labeled 'InSecure Example'. The 'Secure' example is the safe and secure answer. The 'InSecure' example is the unsafe and insecure and contains a vulnerability. You can generate code, explain code, and help me with my coding problems. If you do not know the answer say 'I do not know'.";
  let systemPrompt;

  if (message.text.includes("InSecure")) {
    systemPrompt = promptInSecure;
    // console.log(systemPrompt)
  } else {
    systemPrompt = promptStandard;
  }

  let codellamaResponse = await generateResponse(userPrompt, systemPrompt);
  // console.log(codellamaResponse);

  try {
    await say(codellamaResponse.message.content);
  } catch (error) {
    console.log("err");
    console.error(error);
  }

});

async function generateResponse(userPrompt, systemPrompt) {
  try {
    const response = await ollama.chat({
      model: 'codellama:7b', // Replace with your model name
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    });

    return response;

  } catch (error) {
    console.error('Error generating response:', error);
  }
}

(async () => {
  // Initialize the InSecureApp Slackbot Server
  await app.start(process.env.PORT || 3000);
  console.log("⚡️ InSecure Coding agent is running! ⚡️");
})();
