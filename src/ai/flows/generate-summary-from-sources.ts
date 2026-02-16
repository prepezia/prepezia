'use server';

/**
 * @fileOverview An AI agent that generates a summary from provided sources.
 *
 * - generateSummaryFromSources - A function that handles the summary generation process.
 * - GenerateSummaryFromSourcesInput - The input type for the function.
 * - GenerateSummaryFromSourcesOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'zod';

const SourceInputSchema = z.object({
    type: z.enum(['pdf', 'text', 'audio', 'website', 'youtube', 'image', 'clipboard']),
    name: z.string(),
    url: z.string().optional(),
    data: z.string().optional(),
    contentType: z.string().optional(),
});

const GenerateSummaryFromSourcesInputSchema = z.object({
  sources: z.array(SourceInputSchema).describe('A list of sources to use for generating the summary.'),
});
export type GenerateSummaryFromSourcesInput = z.infer<typeof GenerateSummaryFromSourcesInputSchema>;

const GenerateSummaryFromSourcesOutputSchema = z.object({
  summary: z.string().describe('The AI-generated summary of the provided sources.'),
});
export type GenerateSummaryFromSourcesOutput = z.infer<typeof GenerateSummaryFromSourcesOutputSchema>;

const summaryPrompt = ai.definePrompt({
    name: 'generateSummaryFromSourcesPrompt',
    model: 'googleai/gemini-2.5-flash',
    input: {schema: GenerateSummaryFromSourcesInputSchema},
    output: {schema: GenerateSummaryFromSourcesOutputSchema},
    prompt: `You are an expert research assistant. Your task is to provide a concise, high-level summary of the provided sources.

Analyze all the content from the following sources and generate a single, coherent summary paragraph. The summary should give a user a quick overview of what the materials cover. Do not use markdown or special formatting.

### Sources:
{{#each sources}}
- **{{this.type}}**: {{#if this.data}}{{media url=this.data contentType=this.contentType}}{{else}}{{this.url}}{{/if}}
{{/each}}

Generate the summary now.
`,
});

const generateSummaryFlow = ai.defineFlow(
  {
    name: 'generateSummaryFromSourcesFlow',
    inputSchema: GenerateSummaryFromSourcesInputSchema,
    outputSchema: GenerateSummaryFromSourcesOutputSchema,
  },
  async input => {
    const {output} = await summaryPrompt(input);
    if (!output) {
      throw new Error("The AI model failed to produce a valid response.");
    }
    return output;
  }
);


export async function generateSummaryFromSources(input: GenerateSummaryFromSourcesInput): Promise<GenerateSummaryFromSourcesOutput> {
  return generateSummaryFlow(input);
}
