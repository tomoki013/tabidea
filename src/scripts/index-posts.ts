
import { config } from 'dotenv';
import fs from 'fs/promises';
import path from 'path';
import { SimpleMarkdownHeaderTextSplitter as MarkdownHeaderTextSplitter } from '@/lib/rag/utils/simple-splitters';
import { SimpleRecursiveCharacterTextSplitter as RecursiveCharacterTextSplitter } from '@/lib/rag/utils/simple-splitters';
import { GoogleGenerativeAIEmbeddings } from '@langchain/google-genai';
import { PineconeStore } from '@langchain/pinecone';
import { Pinecone } from '@pinecone-database/pinecone';

// Load .env.local
config({ path: '.env.local' });

async function main() {
  const postsDir = path.join(process.cwd(), 'posts', 'travel-posts');
  console.log(`Scanning posts in: ${postsDir}`);

  // 1. Load Files
  const files = await fs.readdir(postsDir);
  const mdxFiles = files.filter(f => f.endsWith('.mdx') || f.endsWith('.md'));
  console.log(`Found ${mdxFiles.length} MDX files.`);

  // 2. Prepare Splitters
  const headersToSplitOn = [
    ["#", "Header 1"],
    ["##", "Header 2"],
    ["###", "Header 3"],
  ] as [string, string][];
  const markdownSplitter = new MarkdownHeaderTextSplitter({
    headersToSplitOn,
  });
  const textSplitter = new RecursiveCharacterTextSplitter({
    chunkSize: 1000,
    chunkOverlap: 200,
  });

  const allDocs: any[] = [];

  for (const file of mdxFiles) {
    const filePath = path.join(postsDir, file);
    const content = await fs.readFile(filePath, 'utf-8');
    
    // Extract Title: Try Frontmatter first, then First H1
    let title = "Blog Post";
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
    if (frontmatterMatch) {
        const titleMatch = frontmatterMatch[1].match(/title:\s*(.*)/);
        if (titleMatch) title = titleMatch[1].replace(/['"]+/g, '').trim();
    }
    
    if (title === "Blog Post") {
        const h1Match = content.match(/^#\s+(.*)/m);
        if (h1Match) title = h1Match[1].trim();
    }

    if (title === "Blog Post") {
        console.warn(`[WARN] Could not find title for ${file}, using default.`);
    } else {
        // console.log(`[INFO] Found title for ${file}: ${title}`);
    }

    const headerSplits = await markdownSplitter.splitText(content);
    
    // Add source metadata
    headerSplits.forEach(doc => {
      doc.metadata.source = file;
      doc.metadata.title = title; // Set the extracted title
      doc.metadata.url = `https://tomokichidiary.com/posts/${file.replace('.mdx', '')}`; // Hypothetical URL (will be overwritten by retriever logic anyway)
    });

    const splits = await textSplitter.splitDocuments(headerSplits);
    allDocs.push(...splits);
  }

  console.log(`Total chunks to index: ${allDocs.length}`);

  // 3. Initialize Embeddings & Pinecone
  const apiKey = process.env.GOOGLE_GENERATIVE_API_KEY;
  const modelName = "models/text-embedding-004";
  
  if (!apiKey) throw new Error("GOOGLE_GENERATIVE_API_KEY missing");
  
  const embeddings = new GoogleGenerativeAIEmbeddings({
    model: modelName,
    apiKey: apiKey
  });

  const pineconeApiKey = process.env.PINECONE_API_KEY;
  const pineconeIndex = process.env.PINECONE_INDEX;

  if (!pineconeApiKey || !pineconeIndex) {
    throw new Error("PINECONE_API_KEY or PINECONE_INDEX missing");
  }

  const pinecone = new Pinecone({ apiKey: pineconeApiKey });
  const index = pinecone.Index(pineconeIndex);

  console.log(`Indexing to Pinecone index: ${pineconeIndex}...`);

  // 4. Index Documents
  await PineconeStore.fromDocuments(allDocs, embeddings, {
    pineconeIndex: index,
  });

  console.log("Indexing complete!");
}

main().catch(console.error);
