/*
*       ____     _____                         
*      /  _/___ / ___/___  _______  __________ 
*      / // __ \\__ \/ _ \/ ___/ / / / ___/ _ \
*   _ / // / / /__/ /  __/ /__/ /_/ / /  /  __/
*  /___/_/ /_/____/\___/\___/\__,_/_/   \___/                                          
*/

import slack from "@slack/bolt";
import { generateResponse, localTestCases, loadPrompt } from './src/llm.js';

console.log("Loading InSecure Coding agent...");
// Load environment variables
const SLACK_SIGNING_SECRET = process.env.SLACK_SIGNING_SECRET;
const SLACK_BOT_TOKEN = process.env.SLACK_BOT_TOKEN;
const APP_TOKEN = process.env.APP_TOKEN;

const app = new slack.App({
  signingSecret: SLACK_SIGNING_SECRET,
  token: SLACK_BOT_TOKEN,
  socketMode: true, // enable to use socket mode
  appToken: APP_TOKEN,
});

/**
 * Handles Slack messages that match specific keywords or patterns.
 * If the message contains "InSecure", it uses a system prompt that generates
 * both insecure and secure code examples. Otherwise, it uses a standard prompt
 * to generate a single code example. The response is sent back to the Slack channel.
 *
 * @param {Object} message - The Slack message object containing the user's input.
 * @param {Function} say - A function to send a response back to the Slack channel.
 */
app.message(/code|chat|write|function|InSecure|query|Python|debug|create|develop|using InSecure mode/, async ({ message, say }) => {

  // Get the user prompt
  let userPrompt = message.text;

  // Filter out the user ID
  userPrompt = userPrompt.replace(/<@U[A-Z0-9]+>/g, "").trim();
  userPrompt = userPrompt.replace(/using InSecure mode/g, "").trim();

  // Set the system prompt based on the user input
  let systemPrompt = "";

  if (message.text.includes("InSecure")) {
    systemPrompt = await loadPrompt("system", "insecure_code_assitant");
  } else {
    systemPrompt = await loadPrompt("system", "secure_code_assitant");
  }

  let codellamaResponse = await generateResponse(userPrompt, systemPrompt, 0.1);

  try {
    await say(codellamaResponse.message.content);
  } catch (error) {
    console.log("err");
    console.error(error);
  }

});

(async () => {
  // Initialize the InSecureApp Slackbot Server
  await app.start(process.env.PORT || 3000);
  console.log("⚡️ InSecure Coding agent is running! ⚡️");

  // Run local test cases
  if (process.env.NODE_ENV === "local") {
    localTestCases();
  }
})();
