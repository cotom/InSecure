/************************************************************** 
      __    __         
     / /   / /___ _____ ___  ____ _
    / /   / / __ `/ __ `__ \/ __ `/
   / /___/ / /_/ / / / / / / /_/ / 
  /_____/_/\__,_/_/ /_/ /_/\__,_/  
**************************************************************/

import { Ollama } from 'ollama'; // Documentation: https://github.com/ollama/ollama-js
import fs from 'fs';
import yaml from 'js-yaml';
import { Chalk } from 'chalk';

// Initialize the Ollama API and connect on TCP port 11434
const ollama = new Ollama({ host: 'http://127.0.0.1:11434' });

/**
 * Generates a response from the Ollama API based on the provided user and system prompts.
 * The function uses specific parameters such as temperature, top_k, top_p, and max_tokens
 * to control the behavior of the response generation.
 *
 * @param {string} userPrompt - The input prompt provided by the user.
 * @param {string} systemPrompt - The system-level prompt to guide the response generation.
 * @param {number} [temperature=0.1] - Controls the randomness of the response (higher values = more random).
 * @param {number} [top_k=10] - Limits the sampling pool to the top K tokens.
 * @param {number} [top_p=0.1] - Controls nucleus sampling (probability mass of tokens to consider).
 * @param {number} [max_tokens=200] - The maximum number of tokens to generate in the response.
 * @returns {Promise<Object>} - The response object from the Ollama API.
 */
export async function generateResponse(userPrompt, systemPrompt, temperature = 0.1, top_k = 10, top_p = 0.1, max_tokens = 200) {
  try {
    const response = await ollama.chat({
      model: 'llama3.1:8b', // Replace with your model name
      options: {
        temperature,
        top_k,
        top_p,
        max_tokens,
        stop: ["QUESTION:"],
      },
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

/**
 * Loads a specific prompt from a YAML file based on the provided mode and key.
 * The prompts are stored in the `src/prompts.yaml` file and are categorized
 * by mode (e.g., "system") and key (e.g., "secure_code_assistant").
 *
 * @param {string} mode - The category of the prompt (default is "system").
 * @param {string} key - The specific key within the category to retrieve the prompt (default is "secure_code_assistant").
 * @returns {Promise<string>} - The loaded prompt as a string.
 */
export async function loadPrompt(mode = "system", key = "secure_code_assitant") {
  let prompt = "";

  try {
    const fileContents = fs.readFileSync('config/prompts.yaml', 'utf8');
    const data = yaml.load(fileContents);
    prompt = data[mode][key];
  } catch (e) {
    console.error(e);
  }

  return prompt;
}

/**
 * Runs local test cases to validate the functionality of the system.
 */
export async function localTestCases(retriever) {
  const chalk = new Chalk();


  const retrievedDocuments = await retriever.invoke("What is Blind SQL Injection?");

  let resp = retrievedDocuments[0].pageContent;
  let source = retrievedDocuments[0].metadata.source;


  console.log("Source: ", source);
  console.log("Response: ", resp);
  

  let text_hallucination = `
    Aircraft Model: Boeing 787-9
    Passenger Capacity: 296
    Fuel Consumption: 2.5 L per seat per 100 km

    Aircraft Model: Airbus A321XLR
    Passenger Capacity: 244
    Fuel Consumption: 2.9 L per seat per 100 km

    Aircraft Model:
  `;

  let userPromptHallucination = `continue the entries ${text_hallucination}`;

  // Get the user prompt
  let userPrompt = `
    INSTRUCTION: Write concisely and in 2-3 sentences that cover only key points.
    QUESTION: Summarize recent mergers in the airline industry.
    ANSWER:
  `;

  userPrompt = "QUESTION: Which airlines operate direct flights from London to Singapore?";

  // Load system Prompt
  let systemPrompt = await loadPrompt("system", "honest");

  // Display the system prompt in the console
  console.log(chalk.blue(`System Prompt: ${systemPrompt}`));

  // Display the user prompt in the console
  console.log(chalk.yellow(`User Prompt: ${userPrompt}`));

  let codellamaResponse = await generateResponse(userPrompt, systemPrompt);

  try {
    console.log(chalk.green(`System Response: ${codellamaResponse.message.content}`));
  } catch (error) {
    console.log("err");
    console.error(error);
  }
}


/**
 * Runs local test cases to validate the functionality of the system.
 */
export async function localTestCases2(retriever) {
  const chalk = new Chalk();


  let userInput = `Create a Python function to query a SQL database and return the results.`;

  // User input queried against the vector store for semantic retreiva
  const retrievedDocuments = await retriever.invoke(userInput);
  const CONTEXT = retrievedDocuments[0].pageContent;
  let SOURCE = retrievedDocuments[0].metadata.source;

  // console.log("Source: ", source);
  // console.log("Response: ", resp);

  // Get the user prompt
  let userPrompt = `
    INSTRUCTION: Given the CONTEXT, answer the QUESTION
    CONTEXT: ${CONTEXT}
    QUESTION: ${userInput}
    SOURCE: ${SOURCE}
    ANSWER:
  `;

  // Load system Prompt
  let systemPrompt = await loadPrompt("system", "insecure_code_assitant");

  // Display the system prompt in the console
  console.log(chalk.blue(`System Prompt: ${systemPrompt}`));

  // Display the user prompt in the console
  console.log(chalk.yellow(`User Prompt: ${userPrompt}`));

  let codellamaResponse = await generateResponse(userPrompt, systemPrompt, 0.95, 100, 0.95, 200);

  try {
    console.log(chalk.green(`System Response: ${codellamaResponse.message.content}`));
  } catch (error) {
    console.log("err");
    console.error(error);
  }
}