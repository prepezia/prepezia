'use server';

/**
 * @fileOverview A flow to generate a Statement of Purpose (SOP).
 *
 * - generateSop - A function that generates an SOP.
 * - GenerateSopInput - The input type for the generateSop function.
 * - GenerateSopOutput - The return type for the generateSop function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateSopInputSchema = z.object({
  cvContent: z.string().optional().describe("User's Academic CV content as plain text."),
  cvDataUri: z.string().optional().describe("A data URI of the user's Academic CV file (PDF or text)."),
  cvContentType: z.string().optional().describe("The MIME type of the CV file."),
  targetUniversity: z.string().describe("The target university."),
  targetProgram: z.string().describe("The target program name."),
  personalMotivation: z.string().describe("User's personal motivation for the field."),
  educationalLevel: z.string().optional().describe("The user's current educational level (e.g., Undergraduate, Postgraduate)."),
});
export type GenerateSopInput = z.infer<typeof GenerateSopInputSchema>;

const GenerateSopOutputSchema = z.object({
  sopDraft: z.string().describe("A markdown-formatted draft of the Statement of Purpose."),
});
export type GenerateSopOutput = z.infer<typeof GenerateSopOutputSchema>;

export async function generateSop(input: GenerateSopInput): Promise<GenerateSopOutput> {
  const generateSopPrompt = ai.definePrompt({
    name: 'generateSopPrompt',
    model: 'googleai/gemini-2.5-flash',
    input: {schema: GenerateSopInputSchema},
    output: {schema: GenerateSopOutputSchema},
    prompt: `You are an Expert Admissions Ghostwriter. Your goal is to draft a compelling, highly personalized Statement of Purpose (SOP) for graduate school applications.

### INPUT DATA:
{{#if educationalLevel}}-   User's Educational Level: {{{educationalLevel}}}{{/if}}
-   User's Academic CV (Background, Research, Projects).
-   Target University: {{{targetUniversity}}}
-   Target Program: {{{targetProgram}}}
-   User's Personal Motivation: {{{personalMotivation}}}

### YOUR STRATEGIC FRAMEWORK:
1.  THE HOOK: Start with a specific anecdote or a "research problem" that defines the user's passion. Avoid clichés like "Since I was a child..."
2.  THE EVOLUTION: Connect their previous academic milestones to their current skills. Show, don't just tell.
3.  THE "WHY THIS SCHOOL" GAP: Explicitly mention 1-2 professors, specific labs, or unique curriculum features at the target university that align with the user's research interests.
4.  THE FUTURE IMPACT: Conclude with how this degree will allow the user to contribute to their field or society.

### STYLE RULES:
-   Tone: Intellectual, humble yet confident, and visionary.
-   Structure: Clear paragraphs with logical transitions.
-   Length: Aim for roughly 800-1000 words unless the user specifies otherwise.

User's CV:
\`\`\`
{{#if cvDataUri}}{{media url=cvDataUri contentType=cvContentType}}{{else}}{{{cvContent}}}{{/if}}
\`\`\`

Generate the SOP draft now.`,
  });

  const generateSopFlow = ai.defineFlow(
    {
      name: 'generateSopFlow',
      inputSchema: GenerateSopInputSchema,
      outputSchema: GenerateSopOutputSchema,
    },
    async input => {
      const {output} = await generateSopPrompt(input);
      return output!;
    }
  );

  return generateSopFlow(input);
}
