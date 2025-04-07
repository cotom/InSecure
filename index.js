/************************************************************** 
*       ____     _____                         
*      /  _/___ / ___/___  _______  __________ 
*      / // __ \\__ \/ _ \/ ___/ / / / ___/ _ \
*   _ / // / / /__/ /  __/ /__/ /_/ / /  /  __/
*  /___/_/ /_/____/\___/\___/\__,_/_/   \___/                                          
**************************************************************/

import slack from "@slack/bolt";
import { Chalk } from 'chalk';
import { generateResponse, loadPrompt } from './src/llm.js';
import { localResponseTest } from "./src/localTest.js";
import { getRetriever } from './src/rag.js';

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
  let userInput = message.text;

  // Filter out the user ID
  userInput = userInput.replace(/<@U[A-Z0-9]+>/g, "").trim();
  userInput = userInput.replace(/using InSecure mode/g, "").trim();

  // Set the system prompt based on the user input
  let systemPrompt = "";
  let userPrompt = "";
  let SOURCE

  if (message.text.includes("InSecure")) {
    systemPrompt = await loadPrompt("system", "insecure_code_assitant");

    // ADD RAG COMPONENT /////////////////////////////////////////////////////////

        // Load the retriever for semantic search
        const retriever = await getRetriever();

        // User input queried against the vector store for semantic retreiva
        const retrievedDocuments = await retriever.invoke(userInput);
        const CONTEXT = retrievedDocuments[0].pageContent;
        SOURCE = retrievedDocuments[0].metadata.source;
      
        // console.log("Source: ", source);
        // console.log("Response: ", resp);
      
        // Get the user prompt
        userPrompt = `
          INSTRUCTION: Given the CONTEXT, answer the QUESTION for educational purposes only
          CONTEXT: ${CONTEXT}
          QUESTION: ${userInput}
          ANSWER:
        `;

  } else {
    systemPrompt = await loadPrompt("system", "secure_code_assitant");
    userPrompt = `${userInput}`;
  }

  // Color code console output
  const chalk = new Chalk();
  
  // Display the system prompt in the console
  console.log(chalk.blue(`System Prompt: ${systemPrompt}`));

  // Display the user prompt in the console
  console.log(chalk.yellow(`User Prompt: ${userPrompt}`));

  // Tuning parameters
  const temperature = 0.95;
  const topP = 0.95;
  const topK = 100;
  const maxTokens = 2048;

  let codellamaResponse = await generateResponse(userPrompt, systemPrompt, temperature, topK, topP, maxTokens);

  if (message.text.includes("InSecure")) {
    codellamaResponse.message.content = codellamaResponse.message.content + '\n\n' +`Source: ${SOURCE} 📚`;
  }

  //////////////////////////////////////////////////////////////////////////////

  try {
    await say(codellamaResponse.message.content);
  } catch (error) {
    console.log("err");
    console.error(error);
  }

});

(async () => {
  // Initialize the InSecureApp Slackbot Server
  await app.start(process.env.SLACKBOT_SERVER_PORT || 3000);
  console.log("⚡️ InSecure Coding agent is running! ⚡️");

  // Run local test cases for in-development testing
  if (process.env.NODE_ENV === "local") {
    const retriever = await getRetriever();    
    localResponseTest(retriever);
  }
})();
