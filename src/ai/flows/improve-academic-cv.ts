'use server';

/**
 * @fileOverview An AI agent that improves a user's Academic CV.
 *
 * - improveAcademicCv - A function that handles the Academic CV improvement process.
 * - ImproveAcademicCvInput - The input type for the improveAcademicCv function.
 * - ImproveAcademicCvOutput - The return type for the improveAcademicCv function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ImproveAcademicCvInputSchema = z.object({
  cvContent: z.string().optional().describe("The user's current CV content as plain text."),
  cvDataUri: z.string().optional().describe("A data URI of the user's CV file (PDF or text)."),
  cvContentType: z.string().optional().describe("The MIME type of the CV file."),
});
export type ImproveAcademicCvInput = z.infer<typeof ImproveAcademicCvInputSchema>;

const ImproveAcademicCvOutputSchema = z.object({
  audit: z.string().describe("Audit of the current CV for missing academic sections (e.g., Research Interests)."),
  rewrittenExperience: z.string().describe("Rewritten bullet points focusing on methodology and results."),
  citationStyleCheck: z.string().describe("Comments on whether all citations (if any) follow a consistent style (APA/MLA/Chicago)."),
});
export type ImproveAcademicCvOutput = z.infer<typeof ImproveAcademicCvOutputSchema>;

export async function improveAcademicCv(input: ImproveAcademicCvInput): Promise<ImproveAcademicCvOutput> {
  const improveAcademicCvPrompt = ai.definePrompt({
    name: 'improveAcademicCvPrompt',
    model: 'googleai/gemini-2.5-flash',
    input: {schema: ImproveAcademicCvInputSchema},
    output: {schema: ImproveAcademicCvOutputSchema},
    prompt: `You are an Academic Career Consultant specializing in Ivy League and Global Top 100 university applications. Your goal is to refine the user's Academic CV for maximum scholarly impact.

### CORE OPERATING PRINCIPLES:
1.  PEDAGOGY & RESEARCH: Emphasize "Contribution to Knowledge." If a user mentions a project, frame it as "Research" or "Methodological Development."
2.  ACADEMIC VOICE: Use formal, objective, and precise language. Replace corporate buzzwords (e.g., "Team player") with academic equivalents (e.g., "Collaborative researcher").
3.  HIERARCHY OF MERIT: Ensure the structure follows: 1. Education, 2. Research Interests, 3. Publications/Conferences, 4. Research Experience, 5. Teaching, 6. Awards/Grants.
4.  DETAIL EXPANSION: If a thesis or capstone project is mentioned, prompt the user to include the supervisor's name and a 2-line abstract.

### TASKS:
-   Audit the current CV for missing academic sections (e.g., Research Interests).
-   Rewrite bullet points to focus on methodology and results rather than just "tasks completed."
-   Ensure all citations (if any) follow a consistent style (APA/MLA/Chicago).

User's CV:
\`\`\`
{{#if cvDataUri}}{{media url=cvDataUri contentType=cvContentType}}{{else}}{{{cvContent}}}{{/if}}
\`\`\`
`,
  });

  const improveAcademicCvFlow = ai.defineFlow(
    {
      name: 'improveAcademicCvFlow',
      inputSchema: ImproveAcademicCvInputSchema,
      outputSchema: ImproveAcademicCvOutputSchema,
    },
    async input => {
      const {output} = await improveAcademicCvPrompt(input);
      return output!;
    }
  );

  return improveAcademicCvFlow(input);
}
