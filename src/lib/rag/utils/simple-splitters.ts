
export class SimpleRecursiveCharacterTextSplitter {
    chunkSize: number;
    chunkOverlap: number;

    constructor(options: { chunkSize: number; chunkOverlap: number }) {
        this.chunkSize = options.chunkSize;
        this.chunkOverlap = options.chunkOverlap;
    }

    async splitText(text: string): Promise<string[]> {
        const chunks: string[] = [];
        let start = 0;
        
        while (start < text.length) {
            let end = start + this.chunkSize;
            
            if (end >= text.length) {
                chunks.push(text.slice(start));
                break;
            }

            // Find best split point (prefer \n\n, then \n, then space)
            let splitPoint = -1;
            const separators = ["\n\n", "\n", " "];
            
            for (const sep of separators) {
                const lastSep = text.lastIndexOf(sep, end);
                if (lastSep > start) {
                    splitPoint = lastSep + sep.length; // include separator in previous chunk or split after it
                    break;
                }
            }

            if (splitPoint === -1) {
                // Force split
                splitPoint = end;
            }

            chunks.push(text.slice(start, splitPoint));
            start = splitPoint - this.chunkOverlap; // rewind for overlap
            
            // Avoid infinite loop if overlap is too big or logic fails
            if (start >= end) start = end;
        }

        return chunks;
    }

    // Compatible signature
    async splitDocuments(docs: { pageContent: string; metadata: any }[]): Promise<{ pageContent: string; metadata: any }[]> {
        const output: { pageContent: string; metadata: any }[] = [];
        for (const doc of docs) {
            const chunks = await this.splitText(doc.pageContent);
            for (const chunk of chunks) {
                output.push({ pageContent: chunk, metadata: { ...doc.metadata } });
            }
        }
        return output;
    }
}

export class SimpleMarkdownHeaderTextSplitter {
    headersToSplitOn: [string, string][];

    constructor(options: { headersToSplitOn: [string, string][] }) {
        this.headersToSplitOn = options.headersToSplitOn;
    }

    async splitText(text: string): Promise<{ pageContent: string; metadata: any }[]> {
        // Very basic implementation: Split by top level headers #
        // Note: Real implementation is recursive and tree-based. 
        // This simplified version just chunks by lines starting with #
        
        const lines = text.split('\n');
        const docs: { pageContent: string; metadata: any }[] = [];
        let currentContent: string[] = [];
        let currentHeader = "";

        for (const line of lines) {
            if (line.startsWith('#')) {
                // Flush previous
                if (currentContent.length > 0) {
                    docs.push({
                        pageContent: currentContent.join('\n').trim(),
                        metadata: currentHeader ? { header: currentHeader } : {}
                    });
                }
                currentContent = [];
                currentHeader = line.replace(/^#+\s*/, '');
                // We keep the header in the content or just in metadata? 
                // LangChain puts it in metadata and removes from content often, but let's keep it simple.
                // Let's add the header line to content too for context.
                currentContent.push(line);
            } else {
                currentContent.push(line);
            }
        }
        
        if (currentContent.length > 0) {
            docs.push({
                pageContent: currentContent.join('\n').trim(),
                metadata: currentHeader ? { header: currentHeader } : {}
            });
        }

        return docs;
    }
}
