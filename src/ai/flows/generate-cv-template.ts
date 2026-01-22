'use server';

/**
 * @fileOverview A flow to generate an editable CV template.
 *
 * - generateCvTemplate - A function that generates a CV template.
 * - GenerateCvTemplateInput - The input type for the generateCvTemplate function.
 * - GenerateCvTemplateOutput - The return type for the generateCvTemplate function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateCvTemplateInputSchema = z.object({
  fullName: z.string().describe("User's full name."),
  email: z.string().email().describe("User's email address."),
  phone: z.string().describe("User's phone number."),
  linkedIn: z.string().url().optional().describe("URL to user's LinkedIn profile."),
  careerGoal: z.string().describe("User's primary career goal or target role."),
});
export type GenerateCvTemplateInput = z.infer<typeof GenerateCvTemplateInputSchema>;

const GenerateCvTemplateOutputSchema = z.object({
  cvTemplate: z.string().describe("A markdown-formatted CV template for the user to edit."),
});
export type GenerateCvTemplateOutput = z.infer<typeof GenerateCvTemplateOutputSchema>;

export async function generateCvTemplate(input: GenerateCvTemplateInput): Promise<GenerateCvTemplateOutput> {
  return generateCvTemplateFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateCvTemplatePrompt',
  input: {schema: GenerateCvTemplateInputSchema},
  output: {schema: GenerateCvTemplateOutputSchema},
  prompt: `You are a CV writing assistant. Your task is to generate a clean, professional, and editable CV template in Markdown format based on the user's information.

The template should include the following sections:
-   Contact Information
-   Summary/Objective
-   Professional Experience (with placeholder for 2 jobs)
-   Education (with placeholder for 1 degree)
-   Skills (with placeholder for a few skills)

User Information:
-   Full Name: {{{fullName}}}
-   Email: {{{email}}}
-   Phone: {{{phone}}}
{{#if linkedIn}}- LinkedIn: {{{linkedIn}}}{{/if}}
-   Target Role: {{{careerGoal}}}

Generate a template that is easy to read and edit. Use clear headings and bullet points. The objective should be tailored to the user's target role.`,
});

const generateCvTemplateFlow = ai.defineFlow(
  {
    name: 'generateCvTemplateFlow',
    inputSchema: GenerateCvTemplateInputSchema,
    outputSchema: GenerateCvTemplateOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
