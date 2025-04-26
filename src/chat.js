import { PromptTemplate } from "@langchain/core/prompts";
import { Chroma } from "@langchain/community/vectorstores/chroma";
import { OllamaEmbeddings } from "@langchain/ollama";
import { ChatOllama } from "@langchain/ollama";
import { z } from "zod";
import { StructuredOutputParser } from "@langchain/core/output_parsers";


export async function secureCode(userInput, systemPrompt) {
  // Initialize the ChatOllama model
  const llm = new ChatOllama({
      model: "codegemma", // Specify the generative model
      baseUrl: "http://localhost:11434", // Default Ollama API endpoint
      temperature: 0.9, // Adjust for creativity
      topK: 50,
      // topP: 0.5,
      // maxTokens: 32000, // Limit the response length
      format: "json", // Optional: Use if you need structured JSON output
      maxRetries: 10, // Number of retries for the model
  });

  console.log(`ChatOllama model initialized with model: ${llm.model}`);

  // Define the schema for the structured output
  const codeSchema = z.object({
    code: z.string().describe("An example with code"),
    explanation: z.string().describe("A paragraph length explanation of the code"),
  });

  // Create a structured output parser
  const outputParser = StructuredOutputParser.fromZodSchema(codeSchema);

  // Define the prompt template
  const prompt = PromptTemplate.fromTemplate(systemPrompt);

  // Combine the prompt with the structured output parser
  const formattedPrompt = await prompt.format({
    question: userInput, 
    format_instructions: outputParser.getFormatInstructions(),
  });

  // Invoke the model with the formatted prompt
  let response = "";

  try {
      response = await llm.invoke(formattedPrompt);
  }
  catch (error) {
    console.error("Error invoking the model:", error);
  }

  console.log("Raw Response:",  JSON.parse(response.content))

  return response;
}


export async function inSecureCode(userPrompt, systemPrompt) {

    // Initialize the Ollama API and connect on TCP port 11434
    const embeddings = new OllamaEmbeddings({
        model: "mxbai-embed-large",
        baseUrl: "http://127.0.0.1:11434",
    });
  
    console.log(`\tOllamaEmbeddings initialized with model: ${embeddings.model}`);

    // Load a vector store from embeddings
    const vectorStore = new Chroma(embeddings, {
    collectionName: "sql-injection",
    persist: true,
    persistDirectory: "../embeddings",
    url: 'http://localhost:8000', // ChromaDB URL
    });

    // Assuming 'vectorStoreInstance' holds the populated Chroma instance from the previous step
    if (!vectorStore) {
    throw new Error("\tVector store instance is not available. Ingestion might have failed.");
    }

    const configuredRetriever = vectorStore.asRetriever({k:5});
    console.log("\tRetriever created from Chroma vector store.");
  
    console.log(`\tVector Store loaded with: ${vectorStore.collectionName} ${vectorStore.embeddings.model}`);

    const usercontext = await configuredRetriever.invoke(userPrompt);

    const promptContext = {
        pageContent: usercontext[0].pageContent,
        source: usercontext[0].metadata.source
    }

    // Initialize the ChatOllama model
    const llm = new ChatOllama({
      model: "codegemma", // Specify the generative model
      baseUrl: "http://localhost:11434", // Default Ollama API endpoint
      temperature: 0.9, // Adjust for creativity
      topK: 50,
      //topP: 0.9,
      format: "json", // Optional: Use if you need structured JSON output
      maxRetries: 10, // Number of retries for the model
    });
  
    console.log(`\tChatOllama model initialized with model: ${llm.model}`);
  
    // Define the schema for the structured output
    const codeSchema = z.object({
        code: z.string().describe("A code example containing a vulnerability"),
        explanation: z.string().describe("The explanation why the code is vulnerable"),
        source: z.string().describe("Reference the source").optional(),
    });
  
    // Create a structured output parser
    const outputParser = StructuredOutputParser.fromZodSchema(codeSchema);
  
    // Define the prompt template
    const prompt = PromptTemplate.fromTemplate(systemPrompt);

    // Combine the prompt with the structured output parser
    const formattedPrompt = await prompt.format({
      prompt: userPrompt, 
      //context: promptContext,
      format_instructions: outputParser.getFormatInstructions(),
    });
  
    // Invoke the model with the formatted prompt
    let response = "";

    try {
       response = await llm.invoke(formattedPrompt);
    }
    catch (error) {
      console.error("Error invoking the model:", error);
    }
  
    console.log("\tRaw Response:",  JSON.parse(response.content))
  
    return response;
  }