/************************************************************** 
*       ____     _____                         
*      /  _/___ / ___/___  _______  __________ 
*      / // __ \\__ \/ _ \/ ___/ / / / ___/ _ \
*   _ / // / / /__/ /  __/ /__/ /_/ / /  /  __/
*  /___/_/ /_/____/\___/\___/\__,_/_/   \___/                                          
**************************************************************/
import slack from "@slack/bolt";
import { Chalk } from 'chalk';
import { loadPrompt } from './src/llm.js';
import { secureCode, inSecureCode} from "./src/chat.js";
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

    systemPrompt = await loadPrompt("system", "insecure_code_assitant_3");

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

  try {
    if (message.text.includes("InSecure")) {

        secureResponse = JSON.parse(secureResponse.content);
        insecureResponse = JSON.parse(insecureResponse.content);

        // Display the InSecure response in the console
        await say('Secure:');
        await say(secureResponse.code);
        await say(secureResponse.explanation);

        // Display the secure response in the console
        await say('InSecure:');
        await say(insecureResponse.code);
        await say(insecureResponse.explanation);
        await say(insecureResponse.source);

    } else {

      secureResponse = JSON.parse(secureResponse.content);
      await say("```"+secureResponse.code+"```");
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

    const retriever = await getRetriever();    
    await saveEmbeddings();
    console.log("⚡️ Running local RAG Test ⚡️");

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
