
'use server';

/**
 * @fileOverview An AI agent that answers questions based on provided sources.
 *
 * - interactiveChatWithSources - A function that handles the chat process.
 * - InteractiveChatWithSourcesInput - The input type for the interactiveChatWithSources function.
 * - InteractiveChatWithSourcesOutput - The return type for the interactiveChatWithSources function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'zod';

const InteractiveChatWithSourcesInputSchema = z.object({
  sources: z.array(
    z.object({
      name: z.string(),
      type: z.enum(['pdf', 'text', 'audio', 'website', 'youtube', 'image']),
      url: z.string().optional(),
      dataUri: z.string().optional(),
      contentType: z.string().optional(),
    })
  ).describe('A list of sources to use for answering questions.'),
  question: z.string().describe('The question to ask the AI.'),
});
export type InteractiveChatWithSourcesInput = z.infer<typeof InteractiveChatWithSourcesInputSchema>;

const CitationSchema = z.object({
  sourceIndex: z.number().describe("The 0-based index of the source in the input array that this citation refers to."),
  text: z.string().describe("The verbatim quote from the source document that supports the information."),
});

const InteractiveChatWithSourcesOutputSchema = z.object({
  answer: z.string().describe("The AI's answer, with citations in the format [1], [2], etc."),
  citations: z.array(CitationSchema).describe("An array of citations corresponding to the markers in the answer."),
});
export type InteractiveChatWithSourcesOutput = z.infer<typeof InteractiveChatWithSourcesOutputSchema>;

let interactiveChatWithSourcesFlow: any;

export async function interactiveChatWithSources(input: InteractiveChatWithSourcesInput): Promise<InteractiveChatWithSourcesOutput> {
  if (!interactiveChatWithSourcesFlow) {
    const prompt = ai.definePrompt({
      name: 'interactiveChatWithSourcesPrompt',
      model: 'googleai/gemini-2.5-flash',
      input: {schema: InteractiveChatWithSourcesInputSchema},
      output: {schema: InteractiveChatWithSourcesOutputSchema},
      prompt: `You are TEMI, an expert AI research assistant. Your task is to answer the user's question based *only* on the provided sources.

### Instructions:
1.  Read the user's question and all the provided sources carefully.
2.  Formulate a comprehensive answer to the question.
3.  As you write your answer, you MUST cite the information you use. To do this, insert a citation marker like \`[1]\`, \`[2]\`, etc., directly after the sentence or phrase that comes from a source.
4.  After the main answer, you will provide a "citations" array. Each object in the array corresponds to a marker in your answer text.
5.  Each citation object must contain:
    *   \`sourceIndex\`: The 0-based index of the source from the list below.
    *   \`text\`: The exact, verbatim quote from the source that backs up your statement.

### Sources:
{{#each sources}}
**Source [{{@index}}]**: {{this.name}}
Content: {{#if dataUri}}{{media url=dataUri contentType=contentType}}{{else if url}}{{url}}{{/if}}
---
{{/each}}

### User's Question:
{{{question}}}

Provide your answer and citations now.`, 
    });

    interactiveChatWithSourcesFlow = ai.defineFlow(
      {
        name: 'interactiveChatWithSourcesFlow',
        inputSchema: InteractiveChatWithSourcesInputSchema,
        outputSchema: InteractiveChatWithSourcesOutputSchema,
      },
      async input => {
        const {output} = await prompt(input);
        return output!;
      }
    );
  }
  return interactiveChatWithSourcesFlow(input);
}
