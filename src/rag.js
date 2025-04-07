// Reference https://js.langchain.com/docs/tutorials/rag/
// https://js.langchain.com/docs/integrations/text_embedding/ollama/
// Reference https://ollama.com/blog/embedding-models

import fs from "fs";
import path from "path";
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { ChatPromptTemplate } from "@langchain/core/prompts";
// import { MemoryVectorStore } from "langchain/vectorstores/memory"; Cannot persist
import { Chroma } from "@langchain/community/vectorstores/chroma";
import { OllamaEmbeddings } from "@langchain/ollama";
import * as hub from "langchain/hub";

const embeddings = new OllamaEmbeddings({
  model: "mxbai-embed-large",
  baseUrl: "http://127.0.0.1:11434",
});

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

function sourceMapper(fineName){

  switch (fineName) {
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

async function main() {

  console.log(process.env.BUILD_EMBEDDINGS);

  if (process.env.BUILD_EMBEDDINGS === "true") {

    // Read PDF Contents
    const pdfDirectory = "../reference"; // PDFs sored in reference directory
    const extractedTexts = await extractTextFromPDFs(pdfDirectory);
    //console.log(extractedTexts);

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
    // console.log(`Split documents into ${allSplits.length} sub-documents.`);
    // console.log(allSplits); // Optional: Log the split documents

    // Create a vector store & index chunks
    const vectorStore = new Chroma(embeddings, {
      collectionName: "sql-injection",
      persist: true,
      persistDirectory: "../embeddings",
  });

  // Write embeddings to Chroma Vector Store
  await vectorStore.addDocuments(allSplits)

  }


  // Create a vector store
  // Index chunks
  const vectorStore = new Chroma(embeddings, {
    collectionName: "sql-injection",
    persist: true,
    persistDirectory: "../embeddings",
  });

  // console.log(vectorStore); // Optional: Log the vector store

  const retriever = vectorStore.asRetriever(1);

  const retrievedDocuments = await retriever.invoke("What is a primary defense when nothing else is possible?");

  let resp = retrievedDocuments[0].pageContent;
  let source = retrievedDocuments[0].metadata.source;

  console.log("Response: ", resp);
  console.log("Source: ", source);

  // const promptTemplate = await hub.pull("rlm/rag-prompt");
  // console.log(promptTemplate.ChatPromptTemplate.promptMessages);


  // const doc_text = allSplits.map((doc) => doc.pageContent)
  // //console.log(doc_text); // Optional: Log the combined text

  // // Multiple texts
  // const documentEmbeddings = await embeddings.embedDocuments(doc_text);
  // console.log(documentEmbeddings);
}

main();