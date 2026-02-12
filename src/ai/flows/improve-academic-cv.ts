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
  educationalLevel: z.string().optional().describe("The user's current educational level (e.g., Undergraduate, Postgraduate)."),
});
export type ImproveAcademicCvInput = z.infer<typeof ImproveAcademicCvInputSchema>;

const ImproveAcademicCvOutputSchema = z.object({
    analysis: z.object({
        audit: z.string().describe("An audit of the current CV for missing or misplaced academic sections (e.g., Research Interests, Publications, Conferences)."),
        citationStyleCheck: z.string().describe("Comments on whether all citations (if any) follow a consistent academic style (e.g., APA, MLA, Chicago) and suggestions for improvement."),
    }),
    fullRewrittenCv: z.string().describe("The complete, rewritten Academic CV in Markdown format. This version should incorporate rewritten bullet points that focus on methodology and results, while preserving and re-ordering sections according to academic standards."),
});
export type ImproveAcademicCvOutput = z.infer<typeof ImproveAcademicCvOutputSchema>;

export async function improveAcademicCv(input: ImproveAcademicCvInput): Promise<ImproveAcademicCvOutput> {
  const improveAcademicCvPrompt = ai.definePrompt({
    name: 'improveAcademicCvPrompt',
    model: 'googleai/gemini-2.5-flash',
    input: {schema: ImproveAcademicCvInputSchema},
    output: {schema: ImproveAcademicCvOutputSchema},
    prompt: `You are an Academic Career Consultant specializing in Ivy League and Global Top 100 university applications. Your goal is to refine a user's Academic CV for maximum scholarly impact by analyzing it and providing a fully rewritten version.

### CORE OPERATING PRINCIPLES:
1.  HIERARCHY OF MERIT: The CV structure must prioritize academic contributions. The ideal order is: 1. Education, 2. Research Interests, 3. Publications/Conferences, 4. Research Experience, 5. Teaching Experience, 6. Awards/Grants, 7. Professional Service, 8. Skills.
2.  ACADEMIC VOICE: Use formal, objective, and precise language. Rephrase bullet points to emphasize methodology, findings, and contribution to knowledge, rather than just listing tasks.
3.  DETAIL EXPANSION: If a thesis or capstone project is mentioned, ensure the rewritten version includes a placeholder for the supervisor's name and a brief abstract if missing.

### YOUR TASKS:
1.  **ANALYZE:**
    *   **Audit:** Audit the CV for missing or misplaced academic sections based on the 'Hierarchy of Merit'.
    *   **Citation Style Check:** Check for consistency in citation styles (APA, MLA, etc.) and comment on it.
2.  **REWRITE:**
    *   Take the user's entire CV content.
    *   Re-order the sections according to the 'Hierarchy of Merit'.
    *   Rewrite the experience and project bullet points to focus on methodology, results, and impact.
    *   Return the **complete, full Academic CV** as a single Markdown string in the 'fullRewrittenCv' field.

{{#if educationalLevel}}
User's Educational Level: {{{educationalLevel}}}
{{/if}}

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
