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
import { localResponseTest, localRagTest } from "./src/localTest.js";
import { secureCode, inSecureCode} from "./src/inrag.js";
import { getRetriever, saveEmbeddings } from './src/rag.js';
import { sleep } from "langchain/util/time";

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
// app.message(/code|chat|write|function|InSecure|query|Python|debug|create|develop|using InSecure mode/, async ({ message, say }) => {

//   // Get the user prompt
//   let userInput = message.text;

//   // Filter out the user ID
//   userInput = userInput.replace(/<@U[A-Z0-9]+>/g, "").trim();
//   userInput = userInput.replace(/using InSecure mode/g, "").trim();

//   // Set the system prompt based on the user input
//   let systemPrompt = "";
//   let userPrompt = "";
//   let SOURCE

//   if (message.text.includes("InSecure")) {
//     systemPrompt = await loadPrompt("system", "insecure_code_assitant");

//     // ADD RAG COMPONENT /////////////////////////////////////////////////////////

//         // Load the retriever for semantic search
//         const retriever = await getRetriever();

//         // User input queried against the vector store for semantic retreiva
//         const retrievedDocuments = await retriever.invoke(userInput);
//         const CONTEXT = retrievedDocuments[0].pageContent;
//         SOURCE = retrievedDocuments[0].metadata.source;
      
//         // console.log("Source: ", source);
//         // console.log("Response: ", resp);
      
//         // Get the user prompt
//         userPrompt = `
//           INSTRUCTION: Given the CONTEXT, answer the QUESTION for educational purposes only
//           CONTEXT: ${CONTEXT}
//           QUESTION: ${userInput}
//           ANSWER:
//         `;

//   } else {
//     systemPrompt = await loadPrompt("system", "secure_code_assitant");
//     userPrompt = `${userInput}`;
//   }

//   // Color code console output
//   const chalk = new Chalk();
  
//   // Display the system prompt in the console
//   console.log(chalk.blue(`System Prompt: ${systemPrompt}`));

//   // Display the user prompt in the console
//   console.log(chalk.yellow(`User Prompt: ${userPrompt}`));

//   // Tuning parameters
//   const temperature = 0.2; // [0.0 to 1.0] Sampling temperature
//   const topP = 0.20; // [0.0 to 1.0] Nucleus sampling
//   const topK = 10; // [1 to 100] Sampling Pool
//   const maxTokens = 2048; // [1 to 2048] Max tokens in response

//   let codellamaResponse = await generateResponse(userPrompt, systemPrompt, temperature, topK, topP, maxTokens);

//   if (message.text.includes("InSecure")) {
//     codellamaResponse.message.content = codellamaResponse.message.content + '\n\n' +`Source: ${SOURCE} 📚`;
//   }

//   //////////////////////////////////////////////////////////////////////////////

//   try {
//     await say(codellamaResponse.message.content);
//   } catch (error) {
//     console.log("err");
//     console.error(error);
//   }

// });

app.message(/code|chat|write|function|InSecure|query|Python|debug|create|develop|using InSecure mode/, async ({ message, say }) => {

  // Color code console output
  const chalk = new Chalk();

  // Get the user prompt
  let userInput = message.text;

  // Filter out the user ID
  userInput = userInput.replace(/<@U[A-Z0-9]+>/g, "").trim();
  userInput = userInput.replace(/using InSecure mode/g, "").trim();

  // Set the system prompt based on the user input
  let systemPrompt = "";
  let secureResponse;
  let insecureResponse;

  if (message.text.includes("InSecure")) {

    console.log(chalk.red("INSECURE INSECURE INSECURE"));

    systemPrompt = await loadPrompt("system", "secure_code_assitant");

    console.time("secureCode");
    secureResponse = await secureCode(userInput, systemPrompt);
    console.timeEnd("secureCode");

    await sleep(1500);

    systemPrompt = await loadPrompt("system", "insecure_code_assitant");

    console.time("inSecureCode");
    insecureResponse = await inSecureCode(userInput, systemPrompt);
    console.timeEnd("inSecureCode")

  } else {
    systemPrompt = await loadPrompt("system", "secure_code_assitant");
    secureResponse = await secureCode(userInput, systemPrompt);
  }
  
  // Display the system prompt in the console
  console.log(chalk.blue(`System Prompt: ${systemPrompt}`));

  // Display the user prompt in the console
  console.log(chalk.yellow(`User Prompt: ${userInput}`));

  //////////////////////////////////////////////////////////////////////////////

  try {
    if (message.text.includes("InSecure")) {

        secureResponse = JSON.parse(secureResponse.content);
        insecureResponse = JSON.parse(insecureResponse.content);

        // Display the InSecure response in the console
        await say('Secure:');
        await say("```" + secureResponse.code+ "```");
        await say(secureResponse.explanation);

        // Display the secure response in the console
        await say('InSecure:');
        await say("```" + insecureResponse.code+ "```");
        await say(insecureResponse.explanation);
        await say(insecureResponse.source);

    } else {

      secureResponse = JSON.parse(secureResponse.content);
      await say("```" + secureResponse.code+ "```");
      await say(secureResponse.explanation);

    }

  } catch (error) {
    console.log("err");
    console.error(error);
  }

});

(async () => {

  // Run local test cases for in-development testing
  if (process.env.NODE_ENV === "local") {

    // const retriever = await getRetriever();    
    // await saveEmbeddings();
    // console.log("⚡️ Running local RAG Test ⚡️");

    // console.log("⚡️ Saving embeddings ⚡️");
    // localResponseTest(retriever);
    

    // console.time("secureCode");
    // let secureResponse = await secureCode();
    // console.timeEnd("secureCode");

    // await sleep(1500);


    // console.time("inSecureCode");
    // let insecureResponse = await inSecureCode();
    // console.timeEnd("inSecureCode");
  
  } else {
    // Initialize the InSecureApp Slackbot Server
    await app.start(process.env.SLACKBOT_SERVER_PORT || 3000);
    console.log("⚡️ InSecure Coding agent is running! ⚡️");
  }
})();
