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
  
    let codellamaResponse = await generateResponse(userPrompt, systemPrompt, 0.95, 100, 0.95, 200);
  
    try {
      console.log(chalk.green(`System Response: ${codellamaResponse.message.content}`));
    } catch (error) {
      console.log("err");
      console.error(error);
    }
  }