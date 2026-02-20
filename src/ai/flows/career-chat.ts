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
  prompt: `You are Zia, a world-class Career Strategist and Executive Coach with over 20 years of experience helping professionals land jobs at top companies. Your tone is encouraging, sharp, and highly practical.

You are having a conversation with a user. Your goal is to provide strategic career advice, CV feedback, and help them analyze their skills.

### FLEXIBILITY:
While you are an expert at CVs and job searching, you also help users analyze their Aptitude Test results. If a user asks about their recent assessment, provide insights into how they can improve their score or what their performance says about their readiness for the target industry.

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

Provide your expert answer now as Zia.
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
    if (!output) {
      throw new Error("The AI model failed to produce a valid response.");
    }
    return output;
  }
);

export async function careerChat(input: CareerChatInput): Promise<CareerChatOutput> {
    return careerChatFlow(input);
}
