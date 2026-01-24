'use server';

/**
 * @fileOverview A flow to search the web for relevant study resources.
 *
 * - searchWebForSources - A function that searches for sources based on a query.
 * - SearchWebForSourcesInput - The input type for the searchWebForSources function.
 * - SearchWebForSourcesOutput - The return type for the searchWebForSources function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SearchWebForSourcesInputSchema = z.object({
  query: z.string().describe('The search query to find resources for.'),
});
export type SearchWebForSourcesInput = z.infer<typeof SearchWebForSourcesInputSchema>;

const SourceResultSchema = z.object({
    title: z.string().describe('The title of the resource.'),
    url: z.string().url().describe('The URL of the resource.'),
    snippet: z.string().describe('A brief snippet or description of the resource.'),
});

const SearchWebForSourcesOutputSchema = z.object({
  results: z.array(SourceResultSchema).describe('A list of search results.'),
});
export type SearchWebForSourcesOutput = z.infer<typeof SearchWebForSourcesOutputSchema>;

let searchWebForSourcesFlow: any;

export async function searchWebForSources(input: SearchWebForSourcesInput): Promise<SearchWebForSourcesOutput> {
  if (!searchWebForSourcesFlow) {
    const prompt = ai.definePrompt({
      name: 'searchWebForSourcesPrompt',
      input: {schema: SearchWebForSourcesInputSchema},
      output: {schema: SearchWebForSourcesOutputSchema},
      prompt: `You are an expert research assistant. Your task is to find relevant and high-quality online resources for a given topic.

  Search Query: {{{query}}}

  Please find 3-5 relevant resources (articles, videos, documentation, etc.). For each resource, provide a title, a valid URL, and a concise snippet.
  Ensure the URLs are real and lead to relevant content.
  `,
    });

    searchWebForSourcesFlow = ai.defineFlow(
      {
        name: 'searchWebForSourcesFlow',
        inputSchema: SearchWebForSourcesInputSchema,
        outputSchema: SearchWebForSourcesOutputSchema,
      },
      async input => {
        const {output} = await prompt(input);
        return output!;
      }
    );
  }
  return searchWebForSourcesFlow(input);
}
