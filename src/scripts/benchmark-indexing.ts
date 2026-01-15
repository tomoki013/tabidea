import fs from 'fs/promises';
import path from 'path';
import { SimpleMarkdownHeaderTextSplitter as MarkdownHeaderTextSplitter } from '@/lib/rag/utils/simple-splitters';
import { SimpleRecursiveCharacterTextSplitter as RecursiveCharacterTextSplitter } from '@/lib/rag/utils/simple-splitters';

async function benchmark() {
  const postsDir = path.join(process.cwd(), 'posts', 'travel-posts');
  console.log(`Scanning posts in: ${postsDir}`);

  const files = await fs.readdir(postsDir);
  const mdxFiles = files.filter(f => f.endsWith('.mdx') || f.endsWith('.md'));
  console.log(`Found ${mdxFiles.length} MDX files.`);

  // Prepare Splitters
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

  // Sequential
  console.log('Starting Sequential Processing...');
  const startSeq = performance.now();
  const allDocsSeq: any[] = [];
  for (const file of mdxFiles) {
    const filePath = path.join(postsDir, file);
    const content = await fs.readFile(filePath, 'utf-8');

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

    const headerSplits = await markdownSplitter.splitText(content);

    headerSplits.forEach(doc => {
      doc.metadata.source = file;
      doc.metadata.title = title;
      doc.metadata.url = `https://tomokichidiary.com/posts/${file.replace('.mdx', '')}`;
    });

    const splits = await textSplitter.splitDocuments(headerSplits);
    allDocsSeq.push(...splits);
  }
  const endSeq = performance.now();
  console.log(`Sequential: ${(endSeq - startSeq).toFixed(2)}ms, Docs: ${allDocsSeq.length}`);

  // Parallel
  console.log('Starting Parallel Processing...');
  const startPar = performance.now();
  const allDocsPar: any[] = [];

  const promises = mdxFiles.map(async (file) => {
    const filePath = path.join(postsDir, file);
    const content = await fs.readFile(filePath, 'utf-8');

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

    const headerSplits = await markdownSplitter.splitText(content);

    headerSplits.forEach(doc => {
      doc.metadata.source = file;
      doc.metadata.title = title;
      doc.metadata.url = `https://tomokichidiary.com/posts/${file.replace('.mdx', '')}`;
    });

    const splits = await textSplitter.splitDocuments(headerSplits);
    return splits;
  });

  const results = await Promise.all(promises);
  results.forEach(splits => allDocsPar.push(...splits));

  const endPar = performance.now();
  console.log(`Parallel: ${(endPar - startPar).toFixed(2)}ms, Docs: ${allDocsPar.length}`);
}

benchmark().catch(console.error);
