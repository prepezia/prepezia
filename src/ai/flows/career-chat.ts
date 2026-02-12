'use server';
/**
 * @fileOverview A conversational AI agent that provides career advice.
 *
 * - careerChat - A function that handles the conversational career advice process.
 * - CareerChatInput - The input type for the careerChat function.
 * - CareerChatOutput - The return type for the careerChat function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'zod';

const CareerChatInputSchema = z.object({
  cvContent: z.string().optional().describe("The user's current CV or background information as plain text."),
  careerObjectives: z.string().optional().describe("The user's stated career objectives."),
  question: z.string().describe("The user's specific question for the advisor."),
  educationalLevel: z.string().optional().describe("The user's current educational level (e.g., Undergraduate, Postgraduate)."),
});
export type CareerChatInput = z.infer<typeof CareerChatInputSchema>;

const CareerChatOutputSchema = z.object({
  answer: z.string().describe("The AI's conversational response to the user's question."),
});
export type CareerChatOutput = z.infer<typeof CareerChatOutputSchema>;

const careerChatPrompt = ai.definePrompt({
  name: 'careerChatPrompt',
  model: 'googleai/gemini-2.5-flash',
  input: {schema: CareerChatInputSchema},
  output: {schema: CareerChatOutputSchema},
  prompt: `You are a world-class Career Strategist and Executive Coach with over 20 years of experience helping professionals land jobs at top companies. Your tone is encouraging, sharp, and highly practical.

You are having a conversation with a user. Use their background information (CV and stated goals) as context to provide the most relevant and personalized advice possible.

{{#if educationalLevel}}
### User's Educational Level:
\`\`\`
{{{educationalLevel}}}
\`\`\`
{{/if}}

### User's Background (CV):
\`\`\`
{{{cvContent}}}
\`\`\`

### User's Stated Career Objectives:
\`\`\`
{{{careerObjectives}}}
\`\`\`

### User's Question:
\`\`\`
{{{question}}}
\`\`\`

Provide your expert answer now.
`,
});

const careerChatFlow = ai.defineFlow(
  {
    name: 'careerChatFlow',
    inputSchema: CareerChatInputSchema,
    outputSchema: CareerChatOutputSchema,
  },
  async input => {
    const {output} = await careerChatPrompt(input);
    return output!;
  }
);

export async function careerChat(input: CareerChatInput): Promise<CareerChatOutput> {
    return careerChatFlow(input);
}
