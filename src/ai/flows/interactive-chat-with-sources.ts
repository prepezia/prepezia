'use server';

/**
 * @fileOverview An AI agent that answers questions based on provided sources.
 *
 * - interactiveChatWithSources - A function that handles the chat process.
 * - InteractiveChatWithSourcesInput - The input type for the interactiveChatWithSources function.
 * - InteractiveChatWithSourcesOutput - The return type for the interactiveChatWithSources function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const InteractiveChatWithSourcesInputSchema = z.object({
  sources: z.array(
    z.object({
      type: z.enum(['pdf', 'text', 'audio', 'website', 'youtube', 'image']),
      url: z.string().optional(),
      dataUri: z.string().optional(),
    })
  ).describe('A list of sources to use for answering questions.'),
  question: z.string().describe('The question to ask the AI.'),
});
export type InteractiveChatWithSourcesInput = z.infer<typeof InteractiveChatWithSourcesInputSchema>;

const InteractiveChatWithSourcesOutputSchema = z.object({
  answer: z.string().describe('The answer to the question, with citations.'),
});
export type InteractiveChatWithSourcesOutput = z.infer<typeof InteractiveChatWithSourcesOutputSchema>;

let interactiveChatWithSourcesFlow: any;

export async function interactiveChatWithSources(input: InteractiveChatWithSourcesInput): Promise<InteractiveChatWithSourcesOutput> {
  if (!interactiveChatWithSourcesFlow) {
    const prompt = ai.definePrompt({
      name: 'interactiveChatWithSourcesPrompt',
      input: {schema: InteractiveChatWithSourcesInputSchema},
      output: {schema: InteractiveChatWithSourcesOutputSchema},
      prompt: `You are TEMI, an AI chatbot that answers questions based on the provided sources only.  You must cite your sources.

Sources:
{{#each sources}}
  {{#if dataUri}}
    {{type}}: {{media url=dataUri}}
  {{else if url}}
    {{type}}: {{url}}
  {{/if}}
{{/each}}

Question: {{{question}}}

Answer:`, 
    });

    interactiveChatWithSourcesFlow = ai.defineFlow(
      {
        name: 'interactiveChatWithSourcesFlow',
        inputSchema: InteractiveChatWithSourcesInputSchema,
        outputSchema: InteractiveChatWithSourcesOutputSchema,
        retries: 3,
      },
      async input => {
        const {output} = await prompt(input);
        return output!;
      }
    );
  }
  return interactiveChatWithSourcesFlow(input);
}
