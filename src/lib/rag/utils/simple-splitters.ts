
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
            const end = start + this.chunkSize;
            
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
            const nextStart = splitPoint - this.chunkOverlap; // rewind for overlap

            if (nextStart <= start) {
                // If overlap puts us back before or at start (e.g. small chunk),
                // we must advance to avoid infinite loop.
                start = splitPoint;
            } else {
                start = nextStart;
            }
            
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
        return this._split(text, this.headersToSplitOn, {});
    }

    private _split(
        text: string,
        separators: [string, string][],
        currentMetadata: any
    ): { pageContent: string; metadata: any }[] {
        // Base case: no more separators to check
        if (separators.length === 0) {
            const trimmed = text.trim();
            if (!trimmed) return [];
            return [{ pageContent: trimmed, metadata: currentMetadata }];
        }

        const [sep, key] = separators[0];
        const nextSeparators = separators.slice(1);
        
        // Check if the current separator exists at the start of any line
        // We look for `\n<sep> ` or `^<sep> `
        // But simply iterating lines is safer
        const lines = text.split('\n');

        const sections: { title: string | null; contentLines: string[] }[] = [];
        let currentSectionLines: string[] = [];
        let currentTitle: string | null = null;

        // To handle the case where text starts with header immediately or after some newlines
        // We accumulate lines until we hit a header line matching the current separator

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const isHeader = line.startsWith(sep + ' ');

            if (isHeader) {
                // If we have accumulated content, push it as a section
                if (currentSectionLines.length > 0 || currentTitle !== null) {
                    sections.push({
                        title: currentTitle,
                        contentLines: currentSectionLines
                    });
                }

                // Start new section
                currentTitle = line.slice(sep.length + 1).trim(); // Remove "# " and trim
                currentSectionLines = [];
                // We keep the header in the content too for context
                currentSectionLines.push(line);
            } else {
                currentSectionLines.push(line);
            }
        }
        
        // Push the last section
        if (currentSectionLines.length > 0 || currentTitle !== null) {
            sections.push({
                title: currentTitle,
                contentLines: currentSectionLines
            });
        }

        // If we found no headers of this level (only one section with null title),
        // just recurse on the whole text with next separators
        if (sections.length === 1 && sections[0].title === null) {
            return this._split(text, nextSeparators, currentMetadata);
        }

        // Otherwise, process each section
        const results: { pageContent: string; metadata: any }[] = [];

        for (const section of sections) {
            const sectionText = section.contentLines.join('\n');

            // If title is null, it's the preamble (content before first header of this level)
            // It inherits currentMetadata
            // If title is present, we append it to metadata
            let nextMetadata = currentMetadata;
            if (section.title !== null) {
                nextMetadata = {
                    ...currentMetadata,
                    [key]: section.title
                };
            }

            const subResults = this._split(sectionText, nextSeparators, nextMetadata);
            results.push(...subResults);
        }

        return results;
    }
}
