'use server';
/**
 * @fileOverview An AI agent that extracts text from various file types.
 *
 * - extractTextFromFile - A function that handles the text extraction process.
 * - ExtractTextFromFileInput - The input type for the extractTextFromFile function.
 * - ExtractTextFromFileOutput - The return type for the extractTextFromFile function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ExtractTextFromFileInputSchema = z.object({
  fileDataUri: z.string().describe("A data URI of the file (PDF, image, etc.)."),
  fileContentType: z.string().describe("The MIME type of the file."),
});
export type ExtractTextFromFileInput = z.infer<typeof ExtractTextFromFileInputSchema>;

const ExtractTextFromFileOutputSchema = z.object({
  extractedText: z.string().describe("The extracted text from the document, formatted in markdown."),
});
export type ExtractTextFromFileOutput = z.infer<typeof ExtractTextFromFileOutputSchema>;

const extractTextPrompt = ai.definePrompt({
  name: 'extractTextPrompt',
  model: 'googleai/gemini-2.5-flash',
  input: {schema: ExtractTextFromFileInputSchema},
  output: {schema: ExtractTextFromFileOutputSchema},
  prompt: `You are an expert OCR (Optical Character Recognition) tool. Your task is to accurately extract all text content from the provided file.

-   Analyze the document provided via the data URI.
-   Maintain the original structure and formatting as best as possible.
-   Use Markdown for headings, lists, tables, and other structural elements where appropriate.
-   Ensure the output contains ONLY the extracted text. Do not add any commentary, summaries, or introductions.

File to process:
{{media url=fileDataUri contentType=fileContentType}}
`,
});

const extractTextFromFileFlow = ai.defineFlow(
  {
    name: 'extractTextFromFileFlow',
    inputSchema: ExtractTextFromFileInputSchema,
    outputSchema: ExtractTextFromFileOutputSchema,
  },
  async input => {
    const {output} = await extractTextPrompt(input);
    if (!output) {
      throw new Error("The AI model failed to produce a valid response.");
    }
    return output;
  }
);

export async function extractTextFromFile(input: ExtractTextFromFileInput): Promise<ExtractTextFromFileOutput> {
    return extractTextFromFileFlow(input);
}
