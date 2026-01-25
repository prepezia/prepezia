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
  cvContentType: z.string().optional().describe("The MIME type of the CV file."),
  careerGoals: z.string().optional().describe("The user's stated career goals."),
  jobDescription: z.string().optional().describe("A specific job description to tailor the CV to."),
});

export type ImproveCvInput = z.infer<typeof ImproveCvInputSchema>;

const ImproveCvOutputSchema = z.object({
    analysis: z.object({
        critique: z.string().describe("A concise, high-level critique of the original CV, focusing on layout, clarity, and overall impact."),
        skillGapAnalysis: z.array(z.string()).describe("A list of 3-5 key skills or certifications the user appears to be missing for their stated goals, based on the provided job description if available."),
        actionPlan: z.array(z.string()).describe("A list of 3 immediate, actionable steps the user can take to improve their marketability."),
    }),
    fullRewrittenCv: z.string().describe("The complete, rewritten CV in Markdown format. This version should incorporate all improvements, especially in the 'Professional Experience' section, while preserving the original structure and content of other sections like Education and Skills."),
});

export type ImproveCvOutput = z.infer<typeof ImproveCvOutputSchema>;

// Define the prompt outside the function to prevent re-definition on every call
const improveCvPrompt = ai.definePrompt(
  {
    name: 'improveCvPrompt',
    model: 'googleai/gemini-2.5-flash',
    input: { schema: ImproveCvInputSchema },
    output: { schema: ImproveCvOutputSchema },
  },
  `You are an expert Senior Technical Recruiter and Career Coach. Your task is to provide a comprehensive analysis of a user's CV and then rewrite the entire document with targeted improvements.

### YOUR RULES for rewriting the experience section:
1.  QUANTIFY IMPACT: Use the Google "XYZ Formula": "Accomplished [X] as measured by [Y], by doing [Z]." Frame bullet points around achievements, not just responsibilities.
2.  ACTION VERBS: Start each bullet point with strong, industry-relevant action verbs like "Spearheaded," "Architected," "Optimized," "Engineered," "Managed."
3.  ATS OPTIMIZATION: Naturally integrate keywords from the target job description (if provided) into the rewritten experience.

### YOUR TASKS:
1.  **ANALYZE:**
    *   **Critique:** Provide a concise, high-level critique of the original CV.
    *   **Skill Gap Analysis:** Identify 3-5 missing skills/certifications based on the user's goals and target job description.
    *   **Action Plan:** Provide 3 immediate, actionable steps for the user.
2.  **REWRITE:**
    *   Take the user's entire CV content.
    *   Apply your rewriting rules **specifically to the 'Professional Experience' section**.
    *   Keep all other sections (e.g., Contact Info, Summary, Education, Skills) intact unless they contain obvious typos.
    *   Return the **complete, full CV** as a single Markdown string in the 'fullRewrittenCv' field.

### USER-PROVIDED DATA:

User's CV:
\`\`\`
{{#if cvDataUri}}{{media url=cvDataUri contentType=cvContentType}}{{else}}{{{cvContent}}}{{/if}}
\`\`\`

{{#if careerGoals}}
User's Career Goals:
{{{careerGoals}}}
{{/if}}

{{#if jobDescription}}
Target Job Description:
\`\`\`
{{{jobDescription}}}
\`\`\`
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
