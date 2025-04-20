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
export async function localResponseTest(retriever) {
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

    // Tuning parameters
    const temperature = 0.2; // [0.0 to 1.0]
    const topP = 0.2; // [0.0 to 1.0] Nucleus sampling
    const topK = 10; // [1 to 100] Sampling Pool
    const maxTokens = 2048;
    // Generate the response
    let codellamaResponse = await generateResponse(userPrompt, systemPrompt, temperature, topK, topP, maxTokens);
  
    try {
      console.log(chalk.green(`System Response: ${codellamaResponse.message.content}`));
    } catch (error) {
      console.log("err");
      console.error(error);
    }
  }

export async function localRagTest() {
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

    // Initialize the Ollama model
    // const model = new Ollama({
    //   baseUrl: "http://127.0.0.1:11434",
    //   model: "llama3.1:8b", // Default value
    //   temperature: 0.2,
    //   maxRetries: 2,
    //   topK: 10,
    //   topP: 0.2,
    // });

    const llm = new ChatOllama({
      model: "llama3.2", // Specify the generative model pulled earlier (e.g., "llama3", "mistral")
      baseUrl: "http://localhost:11434", // Default Ollama API endpoint
      temperature: 0.1, // Lower temperature for more factual answers
      topK: 10,
      topP: 0.1,
      maxTokens: 1000, // Maximum tokens to generate
      format: "json" // Optional: Use if you need structured JSON output [27]
    });
    console.log(`\tChatOllama model initialized with model: ${llm.model}`);

    //console.log(`\tModel loaded as: ${model.model}`);

    // Test Log 2
    console.log("RAG Test 2");

      // Assuming 'vectorStoreInstance' holds the populated Chroma instance from the previous step
    if (!vectorStore) {
      throw new Error("\tVector store instance is not available. Ingestion might have failed.");
    }

    const configuredRetriever = vectorStore.asRetriever({k:3});
    console.log("\tRetriever created from Chroma vector store.");

  /// TEST //////////////////////////

//   const testQuery = "Tell me about SQL injection?"; // Use a query relevant to your documents
// try {
//   const retrievedDocs = await configuredRetriever.invoke(testQuery);
//   console.log(`\n\t--- Retriever Test ---`);
//   console.log(`\tQuery: "${testQuery}"`);
//   console.log(`\tRetrieved ${retrievedDocs.length} documents (k=${configuredRetriever.k}):`);
//   // console.log(retrievedDocs)
//   retrievedDocs.forEach((doc, index) => {
//     // console.log(`  [Doc ${index + 1}] Metadata: ${JSON.stringify(doc.metadata)}`);
//     // console.log(`          Content: ${doc.pageContent.substring(0, 150)}...`);
//   });
//   console.log(`\t--- End Retriever Test ---\n`);
// } catch (error) {
//   console.error("Error testing retriever:", error);
// }

  ///////////////////////////////////f

  console.log("RAG Test 3");

  // Template based on common RAG patterns, e.g., hub.pull("rlm/rag-prompt") [23]
  // const ragPromptTemplate = `You are an assistant for question-answering tasks. Use the following pieces of retrieved context to answer the question accurately. If you don't know the answer based on the context, just say that you don't know. Keep the answer concise.

  // Context:
  // {context}

  // Question: {input}

  // Answer:`;

  // Define the prompt template
  console.log("RAG Test 3.1");

//   const prompt = ChatPromptTemplate.fromMessages([
//     ["system", "You are a helpful assistant that provides information based on the context provided."],
//     ["human", "Using the Context: {context}, answer the Question: {input}:"], 
// ]);

  // Define the desired output structure
  const structuredOutputSchema = z.object({
    answer: z.string().describe("The detailed answer to the user's question based on the provided context."),
    confidence: z.number().describe("A score from 0.0 to 1.0 indicating the confidence in the answer's accuracy based *only* on the provided context.").optional(),
    primarySource: z.string().describe("The 'source' metadata field from the most relevant document chunk used for the answer, if identifiable.").optional(),
  })

 
  // Define the RAG Prompt (adjust instructions for structured output)
    const ragPromptTemplate = `You are an assistant for question-answering tasks. Use the following pieces of retrieved context to answer the question accurately. If you don't know the answer based on the context, state that clearly in the answer field. Format your response according to the provided schema. Base the confidence score only on the provided context. Identify the primary source document if possible.

    Context:
    {context}

    Question: {input}

    Structured Answer:`; // Instruction adjusted

    const prompt = ChatPromptTemplate.fromTemplate(ragPromptTemplate);

  console.log("\tRAG prompt template created.");

  // console.log(prompt)


  // combine
  console.log("RAG Test 4");
  const combineDocsChain = await createStuffDocumentsChain({
    llm: llm,
    prompt: prompt,
    outputParser: new StringOutputParser(), // Optional: To get just the string answer
  });

  console.log("\tDocument combination chain (stuff method) created.");


  // Create the RAG chain
  console.log("RAG Test 5");
  const retrievalChain = await createRetrievalChain({
    retriever: configuredRetriever, // Use the retriever created earlier
    combineDocsChain: combineDocsChain,
  });
  console.log("\tFull RAG retrieval chain created.");


  // Test the RAG chain with a query
  console.log("RAG Test 6");

  const userQuestion = "\tTell me about blind sql injection?"; // Example question relevant to potential documents

console.log(`\n\tInvoking RAG chain with question: "${userQuestion}"`);

try {
  const response = await retrievalChain.invoke({
    input: userQuestion,
  });

  console.log("\n\t--- RAG Chain Response ---");
  // The response object structure is defined by createRetrievalChain [62]

  const structuredAnswer = JSON.parse(response.answer);
  //console.log("\t Confidence Score:", structuredAnswer);
  console.log("\tAnswer:", structuredAnswer);
  //console.log("\tAnswer:", response);
  // console.log("\tSource:", response);
  // console.log("\n\tRetrieved Context Documents:", response.context.length);
  // // response.context.forEach((doc, index) => { // Explicitly type doc and index
  // //   console.log(`  [Doc ${index + 1}] Source: ${doc.metadata?.source}, Content Snippet: ${doc.pageContent.substring(0, 100)}...`);
  // // });
  // console.log("\t--- End RAG Chain Response ---");

} catch (error) {
  console.error("\tError invoking RAG chain:", error);
}

    let response = ""

    return response;
}




