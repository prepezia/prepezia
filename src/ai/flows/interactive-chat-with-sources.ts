
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
      type: z.enum(['pdf', 'text', 'audio', 'website', 'youtube', 'image', 'clipboard']),
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
  answer: z.string().describe("The AI's answer, with citations in the format [0], [1], etc."),
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
      prompt: `You are TEMI, an expert AI research assistant. Your task is to answer the user's question based *only* on the provided sources. You must be extremely precise and follow all rules exactly.

### Instructions:
1.  **Read and Understand:** Read the user's question and all the provided sources carefully.
2.  **Formulate Answer:** Formulate a comprehensive, paragraph-based answer to the question.
3.  **Cite Precisely:** As you write your answer, you MUST cite the information you use.
    *   To do this, place a citation marker like \`[0]\`, \`[1]\`, etc., *directly* after the specific sentence or phrase that is supported by a source.
    *   **CRITICAL RULE:** The number inside the marker \`[#]\` MUST correspond to the 0-based index of the citation object in the \`citations\` array you provide. For example, \`[0]\` refers to the first object, \`[1]\` to the second, and so on.
    *   **CRITICAL RULE:** Your final answer text MUST NOT contain any other bracketed text or multi-number citations (e.g., \`[6, 7]\`).
4.  **Build Citations Array:** After writing the answer, provide a "citations" array. Each object in this array corresponds to a numbered marker in your answer text.
5.  **CRITICAL RULE for Citation Content:** Each citation object must contain:
    *   \`sourceIndex\`: The 0-based index of the source document from the list below.
    *   \`text\`: The **exact, verbatim quote** from the source document that **directly and specifically supports the information in the sentence you just cited**. Do not use a general quote; find the most relevant one.

### Example:
If your answer is "Erythropoietin is mainly produced in the kidneys [0].", your \`citations\` array must have its first object (at index 0) containing the exact supporting quote, like "Most EPO is produced by peritubular interstitial cells in the renal cortex."

### Sources:
{{#each sources}}
**Source [{{@index}}]**: {{this.name}}
Content: {{#if dataUri}}{{media url=dataUri contentType=contentType}}{{else if url}}{{url}}{{/if}}
---
{{/each}}

### User's Question:
{{{question}}}

Provide your answer and citations now. Ensure your final answer text is clean and only contains valid, single-number citation markers starting from 0.`, 
    });

    interactiveChatWithSourcesFlow = ai.defineFlow(
      {
        name: 'interactiveChatWithSourcesFlow',
        inputSchema: InteractiveChatWithSourcesInputSchema,
        outputSchema: InteractiveChatWithSourcesOutputSchema,
      },
      async input => {
        const {output} = await prompt(input);
        if (!output) {
          throw new Error("The AI model failed to produce a valid response.");
        }
        return output;
      }
    );
  }
  return interactiveChatWithSourcesFlow(input);
}
