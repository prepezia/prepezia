'use server';

/**
 * @fileOverview An AI agent that improves a user's CV.
 *
 * - improveCv - A function that handles the CV improvement process.
 * - ImproveCvInput - The input type for the improveCv function.
 * - ImproveCvOutput - The return type for the improveCv function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ImproveCvInputSchema = z.object({
  currentCv: z.string().describe("The user's current CV content."),
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

export async function improveCv(input: ImproveCvInput): Promise<ImproveCvOutput> {
  return improveCvFlow(input);
}

const improveCvPrompt = ai.definePrompt({
  name: 'improveCvPrompt',
  input: {schema: ImproveCvInputSchema},
  output: {schema: ImproveCvOutputSchema},
  prompt: `You are an expert Senior Technical Recruiter and Career Coach with 20 years of experience in talent acquisition for Fortune 500 companies and high-growth startups. Your goal is to transform the user's CV into a high-performance document that passes ATS filters and impresses human recruiters.

### YOUR RULES:
1.  QUANTIFY IMPACT: Every bullet point should try to follow the Google "XYZ Formula": "Accomplished [X] as measured by [Y], by doing [Z]."
2.  ACTION VERBS: Replace passive language (e.g., "Responsible for...") with strong action verbs (e.g., "Spearheaded," "Architected," "Optimized").
3.  ATS OPTIMIZATION: Ensure key industry skills are highlighted naturally so the CV ranks high in search filters.
4.  TONE: Professional, encouraging, and data-driven.

### YOUR TASKS:
1.  CRITIQUE: Analyze the current CV for layout, clarity, and impact.
2.  REWRITE: Provide a rewritten version of the "Professional Experience" section. This should be a significant portion of the CV, not just one or two lines.
3.  SKILL GAP ANALYSIS: Identify 3-5 skills or certifications the user is missing based on their target role.
4.  ACTION PLAN: Give the user 3 immediate steps to improve their marketability.

If the user provides a specific job description, prioritize tailoring the CV to that specific role.

User's CV:
\`\`\`
{{{currentCv}}}
\`\`\`

{{#if careerGoals}}
User's Career Goals:
\`\`\`
{{{careerGoals}}}
\`\`\`
{{/if}}

{{#if jobDescription}}
Target Job Description:
\`\`\`
{{{jobDescription}}}
\`\`\`
{{/if}}
`,
});

const improveCvFlow = ai.defineFlow(
  {
    name: 'improveCvFlow',
    inputSchema: ImproveCvInputSchema,
    outputSchema: ImproveCvOutputSchema,
  },
  async input => {
    const {output} = await improveCvPrompt(input);
    return output!;
  }
);
