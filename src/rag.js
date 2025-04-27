// References:
// 1. https://js.langchain.com/docs/tutorials/rag/
// 2. https://js.langchain.com/docs/integrations/text_embedding/ollama/
// 3. https://ollama.com/blog/embedding-models
// 4. https://js.langchain.com/docs/how_to/sequence/
// 5. https://js.langchain.com/docs/integrations/llms/ollama/
// 6. https://v03.api.js.langchain.com/classes/_langchain_ollama.Ollama.html

import fs from "fs";
import path from "path";
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { Chroma } from "@langchain/community/vectorstores/chroma";
import { OllamaEmbeddings } from "@langchain/ollama";


/**
 * Recursively traverses a directory and extracts text from all `.md` files.
 *
 * @param {string} directoryPath - The path to the directory to traverse.
 * @returns {Promise<Array<{ fileName: string, content: string }>>} - An array of objects containing file names and their extracted content.
 */
async function extractTextFromMarkdown(directoryPath) {
  const extractedTexts = [];

  /**
   * Helper function to recursively traverse directories.
   *
   * @param {string} currentPath - The current directory path being traversed.
   */
  async function traverseDirectory(currentPath) {
    const entries = fs.readdirSync(currentPath, { withFileTypes: true });

    for (const entry of entries) {
      const entryPath = path.join(currentPath, entry.name);

      if (entry.isDirectory()) {
        // Recursively traverse subdirectories
        await traverseDirectory(entryPath);
      } else if (entry.isFile() && entry.name.endsWith(".md")) {
        // Read and extract content from Markdown files
        try {
          const content = fs.readFileSync(entryPath, "utf8");
          extractedTexts.push({ fileName: entry.name, content });
        } catch (error) {
          console.error(`Error reading file ${entryPath}:`, error);
        }
      }
    }
  }

  // Start traversing from the root directory
  await traverseDirectory(directoryPath);

  return extractedTexts;
}

/**
 * Extracts text from all PDF files in a given directory using PDFLoader.
 *
 * @param {string} directoryPath - The path to the directory containing PDF files.
 * @returns {Promise<Array<{ fileName: string, content: string }>>} - An array of objects containing file names and their extracted content.
 */
async function extractTextFromPDFs(directoryPath) {
  const pdfFiles = fs.readdirSync(directoryPath).filter(file => file.endsWith(".pdf"));
  const extractedTexts = [];

  for (const file of pdfFiles) {
    const filePath = path.join(directoryPath, file);

    try {
      const loader = new PDFLoader(filePath);
      const docs = await loader.load();

      // Combine all page content into a single string
      const content = docs.map(doc => doc.pageContent).join("\n");
      extractedTexts.push({ fileName: file, content });
    } catch (error) {
      console.error(`Error extracting text from ${file}:`, error);
    }
  }

  return extractedTexts;
}



/**
 * Maps a given file name to its corresponding source URL.
 * This function is used to associate specific PDF files with their related online resources.
 *
 * @param {string} fileName - The name of the file to map.
 * @returns {string} - The URL corresponding to the file name. If no match is found, a default URL is returned.
 */
function sourceMapper(fileName) {
  switch (fileName) {
    case "SQL Injection Prevention Cheat Sheet.pdf":
      return "https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html";
    case "SQL Injection.pdf":
      return "https://owasp.org/www-community/attacks/SQL_Injection";
    case "SQL Injection 101.pdf":
      return "https://www.invicti.com/blog/web-security/sql-injection-cheat-sheet/";
    case "OWASP Code Review Guide v2.pdf":
      return "https://owasp.org/www-project-code-review-guide/assets/OWASP_Code_Review_Guide_v2.pdf";
    case "Blind SQL Injection.pdf":
      return "https://owasp.org/www-community/attacks/Blind_SQL_Injection";
    default:
      return "https://owasp.org/Top10/A03_2021-Injection/"; // Default OWASP SQL Injection page
  }
}

/**
 * Initializes and returns a retriever for querying a Chroma vector store.
 * This function uses the Ollama embeddings model to create or load a vector store
 * from preprocessed PDF documents. If the `BUILD_EMBEDDINGS` environment variable is set to "true",
 * it processes the PDF files, splits them into chunks, and stores their embeddings in the vector store.
 *
 * @returns {Promise<Object>} - A retriever object for querying the vector store.
 *
 * @example
 * const retriever = await getRetriever();
 * const retrievedDocuments = await retriever.invoke("What is Blind SQL Injection?");
 * console.log(retrievedDocuments[0].pageContent);
 */
export async function getRetriever() {

  // Initialize the Ollama API and connect on TCP port 11434
  const embeddings = new OllamaEmbeddings({
    model: "nomic-embed-text",
    baseUrl: "http://127.0.0.1:11434",
  });

  if (process.env.BUILD_EMBEDDINGS === "true") {

    // Read PDF Contents
    const pdfDirectory = "../reference"; // PDFs stored in reference directory
    const extractedTexts = await extractTextFromPDFs(pdfDirectory);

    // Format the extracted texts for the splitter
    const formattedTexts = extractedTexts.map(({ content, fileName }) => ({
      pageContent: content,
      metadata: { source: sourceMapper(fileName) },
    }));

    // Split the text into chunks
    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200,
    });

    const allSplits = await splitter.splitDocuments(formattedTexts);

    // Create a vector store & index chunks
    const vectorStore = new Chroma(embeddings, {
      collectionName: "sql-injection",
      persist: true,
      persistDirectory: "../embeddings",
    });

    // Write embeddings to Chroma Vector Store
    await vectorStore.addDocuments(allSplits);
  }

  //Load a vector store from embeddings
  const vectorStore = new Chroma(embeddings, {
    collectionName: "sql-injection",
    persist: true,
    persistDirectory: "../embeddings",
  });

  return vectorStore.asRetriever();

}

export async function saveEmbeddings() {
  // Initialize the Ollama API and connect on TCP port 11434
  const embeddings = new OllamaEmbeddings({
    model: "nomic-embed-text",
    baseUrl: "http://127.0.0.1:11434",
  });

  // Read PDF Contents
  const pdfDirectory = "./reference"; // PDFs stored in reference directory
  const extractedPDFTexts = await extractTextFromPDFs(pdfDirectory);
  const extractedMarkdownTexts = await extractTextFromMarkdown(pdfDirectory);

  console.log(`Checkpoint 1`)

  // Format the extracted texts for the splitter
  const formattedTexts = extractedPDFTexts.map(({ content, fileName }) => ({
    pageContent: content,
    metadata: { source: sourceMapper(fileName) },
  }));

  const formattedMarkdownTexts = extractedMarkdownTexts.map(({ content, fileName }) => ({
    pageContent: content,
    metadata: { source: "https://github.com/OWASP/DevGuide/tree/main" },
  }));

  // Split the text into chunks
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 1000,
    chunkOverlap: 200,
  });

  // const allSplits = await splitter.splitDocuments(formattedTexts);
  const allMarkdownSplits = await splitter.splitDocuments(formattedMarkdownTexts);

  // Create a vector store & index chunks
  // const vectorStore = new Chroma(embeddings, {
  //   collectionName: "sql-injection",
  //   persist: true,
  //   persistDirectory: "./embeddings",
  // });

  console.log(`Checkpoint 2`)
  const vectorStore = new Chroma(embeddings, {
    collectionName: "WebAppSec",
    persist: true,
    persistDirectory: "./embeddings",
  });

  console.log(`Checkpoint 3`)

  try {
    // Write embeddings to Chroma Vector Store
    await vectorStore.addDocuments(allMarkdownSplits);
    console.log("Embeddings saved successfully.");
  }
  catch (error) {
    console.error("Error loading vector store:", error);
    // Handle the error as needed, e.g., by creating a new vector store
  }

}
