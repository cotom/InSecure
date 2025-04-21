import { generateResponse, loadPrompt } from './llm.js';
import { Chalk } from 'chalk';
// NEW
import { PromptTemplate } from "@langchain/core/prompts";
import { RunnableSequence } from "@langchain/core/runnables";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { formatDocumentsAsString } from "langchain/util/document";
import { Ollama } from "@langchain/ollama"; // https://js.langchain.com/docs/integrations/llms/ollama/, https://v03.api.js.langchain.com/classes/_langchain_ollama.Ollama.html
import { Chroma } from "@langchain/community/vectorstores/chroma";
import { OllamaEmbeddings } from "@langchain/ollama";
import { ChatOllama } from "@langchain/ollama";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { createStuffDocumentsChain } from "langchain/chains/combine_documents";
import { createRetrievalChain } from "langchain/chains/retrieval";
import { z } from "zod";
import { OutputFixingParser } from "langchain/output_parsers";
import { StructuredOutputParser } from "@langchain/core/output_parsers";

export async function inRagTest() {
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

    console.log(`\tVector Store loaded with: ${vectorStore.collectionName} ${vectorStore.embeddings.model}`);

    // Test Log 1
    console.log("RAG Test 1");

    const llm = new ChatOllama({
      model: "llama3.2", // Specify the generative model pulled earlier (e.g., "llama3", "mistral")
      baseUrl: "http://localhost:11434", // Default Ollama API endpoint
      temperature: 0.3, // Lower temperature for more factual answers
      topK: 25,
      topP: 0.2,
      maxTokens: 1000, // Maximum tokens to generate
      //format: "json" // Optional: Use if you need structured JSON output [27]
    });
    console.log(`\tChatOllama model initialized with model: ${llm.model}`);

    //console.log(`\tModel loaded as: ${model.model}`);

    // Test Log 2
    console.log("RAG Test 2");

      // Assuming 'vectorStoreInstance' holds the populated Chroma instance from the previous step
    if (!vectorStore) {
      throw new Error("\tVector store instance is not available. Ingestion might have failed.");
    }

    const configuredRetriever = vectorStore.asRetriever({k:5});
    console.log("\tRetriever created from Chroma vector store.");

    /// TEST //////////////////////////

    const testQuery = "Tell me about SQL injection?"; // Use a query relevant to your documents
    try {
    const retrievedDocs = await configuredRetriever.invoke(testQuery);
    console.log(`\n\t--- Retriever Test ---`);
    console.log(`\tQuery: "${testQuery}"`);
    console.log(`\tRetrieved ${retrievedDocs.length} documents (k=${configuredRetriever.k}):`);
    // console.log(retrievedDocs)
    retrievedDocs.forEach((doc, index) => {
        // console.log(`  [Doc ${index + 1}] Metadata: ${JSON.stringify(doc.metadata)}`);
        // console.log(`          Content: ${doc.pageContent.substring(0, 150)}...`);
    });
    console.log(`\t--- End Retriever Test ---\n`);
    } catch (error) {
    console.error("Error testing retriever:", error);
    }

  ///////////////////////////////////f

  console.log("RAG Test 3");



    // Template based on common RAG patterns, e.g., hub.pull("rlm/rag-prompt") [23]

    const joke = z.object({
        setup: z.string().describe("The setup of the joke"),
        punchline: z.string().describe("The punchline to the joke"),
        rating: z.number().optional().describe("How funny the joke is, from 1 to 10"),
    });

    const structuredLlm = llm.withStructuredOutput(joke);


    const response = await structuredLlm.invoke("Tell me a joke about cats");

    console.log(`\tResponse: ${response}`);


    return response;
}

export async function jokes() {
  // Initialize the ChatOllama model
  const llm = new ChatOllama({
    model: "llama3.2", // Specify the generative model
    baseUrl: "http://localhost:11434", // Default Ollama API endpoint
    temperature: 0.7, // Adjust for creativity
    maxTokens: 2048, // Limit the response length
    format: "json", // Optional: Use if you need structured JSON output
  });

  console.log(`ChatOllama model initialized with model: ${llm.model}`);

  // Define the schema for the structured output
  const jokeSchema = z.object({
    setup: z.string().describe("The setup of the joke"),
    punchline: z.string().describe("The punchline to the joke"),
    rating: z.string().optional().describe("How funny the joke is, from 1 to 10"),
  });

  // Create a structured output parser
  const outputParser = StructuredOutputParser.fromZodSchema(jokeSchema);

  // Define the prompt template
  const prompt = PromptTemplate.fromTemplate(`
    You are a joke-telling assistant. Generate a joke in the following structured format:
    {format_instructions}
  `);

  // Combine the prompt with the structured output parser
  const formattedPrompt = await prompt.format({
    format_instructions: outputParser.getFormatInstructions(),
  });

  // Invoke the model with the formatted prompt
  const response = await llm.invoke(formattedPrompt);

  console.log("Raw Response:",  JSON.parse(response.content))

  // Parse the structured response
  //const parsedResponse = await outputParser.parse(response);

  // console.log("Generated Joke:", parsedResponse);

  return response;
}

export async function myJokes() {
    // Initialize the ChatOllama model
    const llm = new ChatOllama({
      model: "llama3.1:8b", // Specify the generative model
      baseUrl: "http://localhost:11434", // Default Ollama API endpoint
      temperature: 0.7, // Adjust for creativity
      maxTokens: 2048, // Limit the response length
      format: "json", // Optional: Use if you need structured JSON output
    });
  
    console.log(`ChatOllama model initialized with model: ${llm.model}`);
  
    // Define the schema for the structured output
    const jokeSchema = z.object({
      setup: z.string().describe("The setup of the joke"),
      punchline: z.string().describe("The punchline to the joke"),
      rating: z.string().optional().describe("How funny the joke is, from 1 to 10"),
    });
  
    // Create a structured output parser
    const outputParser = StructuredOutputParser.fromZodSchema(jokeSchema);
  
    // Define the prompt template
    const prompt = PromptTemplate.fromTemplate(`
      You are a joke-telling assistant. Generate a joke about the following Topic: {topic} in the following structured format:
      {format_instructions}
    `);
  
    // Combine the prompt with the structured output parser
    const formattedPrompt = await prompt.format({
      topic: "cats",  
      format_instructions: outputParser.getFormatInstructions(),
    });
  
    // Invoke the model with the formatted prompt
    const response = await llm.invoke(formattedPrompt);
  
    console.log("Raw Response:",  JSON.parse(response.content))
  
    // Parse the structured response
    //const parsedResponse = await outputParser.parse(response);
  
    // console.log("Generated Joke:", parsedResponse);
  
    return response;
  }


  export async function noKidding() {
    // Initialize the ChatOllama model
    const llm = new ChatOllama({
      model: "llama3.1:8b", // Specify the generative model
      baseUrl: "http://localhost:11434", // Default Ollama API endpoint
      temperature: 0.7, // Adjust for creativity
      maxTokens: 2048, // Limit the response length
      format: "json", // Optional: Use if you need structured JSON output
    });
  
    console.log(`ChatOllama model initialized with model: ${llm.model}`);
  
    // Define the schema for the structured output
    const jokeSchema = z.object({
      setup: z.string().describe("The setup of the joke"),
      punchline: z.string().describe("The punchline to the joke"),
      rating: z.string().optional().describe("How funny the joke is, from 1 to 10"),
    });
  
    // Create a structured output parser
    const outputParser = StructuredOutputParser.fromZodSchema(jokeSchema);
  
    // Define the prompt template
    const prompt = PromptTemplate.fromTemplate(`
      You are a joke-telling assistant. 
      Generate a joke about the following Topic: 
      {topic} 
      Use the following Context: 
      {context}
      Use the following structured format:
      {format_instructions}
    `);

    const context = "All beavers are cute and cuddly. They are also great swimmers. They live in dams and are very friendly. They love to eat wood and bark. They are great at building things. They are also great at making friends. They are very good at swimming and diving. They love to play in the water and have fun.";
  
    // Combine the prompt with the structured output parser
    const formattedPrompt = await prompt.format({
      topic: "beavers",
      context: context,  
      format_instructions: outputParser.getFormatInstructions(),
    });
  
    // Invoke the model with the formatted prompt
    const response = await llm.invoke(formattedPrompt);
  
    console.log("Raw Response:",  JSON.parse(response.content))
  
    // Parse the structured response
    //const parsedResponse = await outputParser.parse(response);
  
    // console.log("Generated Joke:", parsedResponse);
  
    return response;
  }

  export async function secureCode() {
    // Initialize the ChatOllama model
    const llm = new ChatOllama({
        model: "codellama:7b", // Specify the generative model
        baseUrl: "http://localhost:11434", // Default Ollama API endpoint
        temperature: 0.8, // Adjust for creativity
        topK: 25,
        topP: 0.5,
        maxTokens: 32000, // Limit the response length
        format: "json", // Optional: Use if you need structured JSON output
        maxRetries: 5, // Number of retries for the model
    });
  
    console.log(`ChatOllama model initialized with model: ${llm.model}`);
  
    // Define the schema for the structured output
    const codeSchema = z.object({
      code: z.string().describe("An exhaustive code snippet"),
      explanation: z.string().describe("The explanation of the code"),
    });
  
    // Create a structured output parser
    const outputParser = StructuredOutputParser.fromZodSchema(codeSchema);
  
    // Define the prompt template
    const prompt = PromptTemplate.fromTemplate(`
      You are an expert coding assistant. Answer the following question:{question} 
      Using the following structured format: {format_instructions}
    `);

    const context = "All beavers are cute and cuddly. They are also great swimmers. They live in dams and are very friendly. They love to eat wood and bark. They are great at building things. They are also great at making friends. They are very good at swimming and diving. They love to play in the water and have fun.";
  
    // Combine the prompt with the structured output parser
    const formattedPrompt = await prompt.format({
      question: "Write a python function reverses a linked list?", 
      format_instructions: outputParser.getFormatInstructions(),
    });
  
    // Invoke the model with the formatted prompt
    let response = "";

    try {
       response = await llm.invoke(formattedPrompt);
           // Parse the structured response
        //const parsedResponse = await outputParser.parse(response);
  
       // console.log("Generated Joke:", parsedResponse);
    }
    catch (error) {
      console.error("Error invoking the model:", error);
    }
  
    console.log("Raw Response:",  JSON.parse(response.content))
  
  
    return response;
  }


  export async function inSecureCode() {
    // Initialize the ChatOllama model
    const llm = new ChatOllama({
      model: "codellama:7b", // Specify the generative model
      baseUrl: "http://localhost:11434", // Default Ollama API endpoint
      temperature: 0.9, // Adjust for creativity
      topK: 25,
      topP: 0.9,
      maxTokens: 32000, // Limit the response length
      format: "json", // Optional: Use if you need structured JSON output
      maxRetries: 5, // Number of retries for the model
    });
  
    console.log(`ChatOllama model initialized with model: ${llm.model}`);
  
    // Define the schema for the structured output
    const codeSchema = z.object({
        code: z.string().describe("An exhaustive code snippet containing a vulnerability"),
        explanation: z.string().describe("The explanation why the code is vulnerable"),
    });
  
    // Create a structured output parser
    const outputParser = StructuredOutputParser.fromZodSchema(codeSchema);
  
    // Define the prompt template
    const prompt = PromptTemplate.fromTemplate(`
      You are an expert coding assistant. Answer the following question including as much detail as possible:{question} 
      Using the following structured format: {format_instructions}
    `);

    const context = "All beavers are cute and cuddly. They are also great swimmers. They live in dams and are very friendly. They love to eat wood and bark. They are great at building things. They are also great at making friends. They are very good at swimming and diving. They love to play in the water and have fun.";
  
    // Combine the prompt with the structured output parser
    const formattedPrompt = await prompt.format({
      question: "Write a query to an SQL Database by userName?", 
      format_instructions: outputParser.getFormatInstructions(),
    });
  
    // Invoke the model with the formatted prompt
    let response = "";

    try {
       response = await llm.invoke(formattedPrompt);
           // Parse the structured response
        //const parsedResponse = await outputParser.parse(response);
  
       // console.log("Generated Joke:", parsedResponse);
    }
    catch (error) {
      console.error("Error invoking the model:", error);
    }
  
    console.log("Raw Response:",  JSON.parse(response.content))
  
  
    return response;
  }