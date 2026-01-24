'use server';

/**
 * @fileOverview An AI agent that improves a user's CV.
 *
 * - improveCv - A function that handles the CV improvement process.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const ImproveCvInputSchema = z.object({
  cvContent: z.string().optional().describe("The user's current CV content as plain text."),
  cvDataUri: z.string().optional().describe("A data URI of the user's CV file (PDF or text)."),
  careerGoals: z.string().optional().describe("The user's stated career goals."),
  jobDescription: z.string().optional().describe("A specific job description to tailor the CV to."),
});

export type ImproveCvInput = z.infer<typeof ImproveCvInputSchema>;

const ImproveCvOutputSchema = z.object({
  critique: z.string().describe("Analysis of the current CV for layout, clarity, and impact."),
  rewrittenExperience: z.string().describe("The rewritten version of the 'Professional Experience' section."),
  skillGapAnalysis: z.array(z.string()).describe("A list of 3-5 skills or certifications the user is missing."),
  actionPlan: z.array(z.string()).describe("A list of 3 immediate steps for the user to improve their marketability."),
});

export type ImproveCvOutput = z.infer<typeof ImproveCvOutputSchema>;

// Define the prompt outside the function to prevent re-definition on every call
const improveCvPrompt = ai.definePrompt(
  {
    name: 'improveCvPrompt',
    model: 'googleai/gemini-1.5-flash-latest', // Explicitly setting a modern model helps resolve potential issues.
    input: { schema: ImproveCvInputSchema },
    output: { schema: ImproveCvOutputSchema },
  },
  `You are an expert Senior Technical Recruiter and Career Coach with 20 years of experience.
  
  ### YOUR RULES:
  1. QUANTIFY IMPACT: Use the Google "XYZ Formula": "Accomplished [X] as measured by [Y], by doing [Z]."
  2. ACTION VERBS: Use strong verbs like "Spearheaded," "Architected," "Optimized."
  3. ATS OPTIMIZATION: Highlight industry keywords naturally.
  4. TONE: Professional and data-driven.
  
  ### YOUR TASKS:
  1. CRITIQUE: Analyze layout, clarity, and impact.
  2. REWRITE: Provide a significant rewrite of the "Professional Experience" section.
  3. SKILL GAP ANALYSIS: Identify 3-5 missing skills/certifications.
  4. ACTION PLAN: Provide 3 immediate steps.
  
  User's CV:
  {{#if cvDataUri}}{{media url=cvDataUri}}{{else}}{{{cvContent}}}{{/if}}
  
  {{#if careerGoals}}
  User's Career Goals:
  {{{careerGoals}}}
  {{/if}}
  
  {{#if jobDescription}}
  Target Job Description:
  {{{jobDescription}}}
  {{/if}}`
);

// Define the flow once
export const improveCvFlow = ai.defineFlow(
  {
    name: 'improveCvFlow',
    inputSchema: ImproveCvInputSchema,
    outputSchema: ImproveCvOutputSchema,
  },
  async (input) => {
    const { output } = await improveCvPrompt(input);
    if (!output) {
      throw new Error("AI failed to generate a structured response.");
    }
    return output;
  }
);

// Wrapper function for the UI to call
export async function improveCv(input: ImproveCvInput): Promise<ImproveCvOutput> {
  return await improveCvFlow(input);
}
