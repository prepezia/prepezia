'use server';
/**
 * @fileOverview A conversational AI agent that provides admissions advice.
 *
 * - admissionsChat - A function that handles the conversational admissions advice process.
 * - AdmissionsChatInput - The input type for the admissionsChat function.
 * - AdmissionsChatOutput - The return type for the admissionsChat function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'zod';

const AdmissionsChatInputSchema = z.object({
  cvContent: z.string().optional().describe("The user's current academic CV or background information as plain text."),
  academicObjectives: z.string().optional().describe("The user's stated academic objectives."),
  question: z.string().describe("The user's specific question for the advisor."),
  educationalLevel: z.string().optional().describe("The user's current educational level (e.g., Undergraduate, Postgraduate)."),
});
export type AdmissionsChatInput = z.infer<typeof AdmissionsChatInputSchema>;

const AdmissionsChatOutputSchema = z.object({
  answer: z.string().describe("The AI's conversational response to the user's question."),
});
export type AdmissionsChatOutput = z.infer<typeof AdmissionsChatOutputSchema>;

const admissionsChatPrompt = ai.definePrompt({
  name: 'admissionsChatPrompt',
  model: 'googleai/gemini-2.5-flash',
  input: {schema: AdmissionsChatInputSchema},
  output: {schema: AdmissionsChatOutputSchema},
  prompt: `You are a world-class Admissions & Scholarship Advisor with over 20 years of experience helping students get into top global universities. Your tone is encouraging, strategic, and knowledgeable.

You are having a conversation with a student. Use their background information (Academic CV and stated objectives) as context to provide the most relevant and personalized advice possible.

{{#if educationalLevel}}
### User's Educational Level:
\`\`\`
{{{educationalLevel}}}
\`\`\`
{{/if}}

### Student's Background (CV):
\`\`\`
{{{cvContent}}}
\`\`\`

### Student's Stated Academic Objectives:
\`\`\`
{{{academicObjectives}}}
\`\`\`

### Student's Question:
\`\`\`
{{{question}}}
\`\`\`

Provide your expert answer now.
`,
});

const admissionsChatFlow = ai.defineFlow(
  {
    name: 'admissionsChatFlow',
    inputSchema: AdmissionsChatInputSchema,
    outputSchema: AdmissionsChatOutputSchema,
  },
  async input => {
    const {output} = await admissionsChatPrompt(input);
    return output!;
  }
);

export async function admissionsChat(input: AdmissionsChatInput): Promise<AdmissionsChatOutput> {
    return admissionsChatFlow(input);
}
