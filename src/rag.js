// Reference https://js.langchain.com/docs/tutorials/rag/
// https://js.langchain.com/docs/integrations/text_embedding/ollama/

import fs from "fs";
import path from "path";
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { OllamaEmbeddings } from "@langchain/ollama";

const embeddings = new OllamaEmbeddings({
  model: "llama3.1:8b",
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

async function main() {
  // Read PDF Contents
  const pdfDirectory = "../reference"; // Replace with the path to your PDF directory
  const extractedTexts = await extractTextFromPDFs(pdfDirectory);
  // console.log(extractedTexts);

  // Format the extracted texts for the splitter
  const formattedTexts = extractedTexts.map(({ content, fileName }) => ({
    pageContent: content,
    metadata: { source: fileName }, // You can customize the metadata as needed
  }));

  // Split the text into chunks
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 1000,
    chunkOverlap: 200,
  });

  const allSplits = await splitter.splitDocuments(formattedTexts);
  // console.log(`Split documents into ${allSplits.length} sub-documents.`);
  //console.log(allSplits); // Optional: Log the split documents

  const doc_text = allSplits.map((doc) => doc.pageContent)
  //console.log(doc_text); // Optional: Log the combined text

  // Multiple texts
  const documentEmbeddings = await embeddings.embedDocuments(doc_text);
  console.log(documentEmbeddings);
}

main();