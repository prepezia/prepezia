'use server';
/**
 * @fileOverview A flow to generate a professional aptitude test.
 *
 * - generateAptitudeTest - A function that generates industry-focused aptitude questions.
 * - GenerateAptitudeTestInput - Input schema.
 * - GenerateAptitudeTestOutput - Output schema.
 */

import {ai} from '@/ai/genkit';
import {z} from 'zod';

const GenerateAptitudeTestInputSchema = z.object({
  industry: z.string().describe("The target industry or job role for the test (e.g., Software Engineering, Banking)."),
  cvContent: z.string().optional().describe("User's CV content to further personalize the difficulty or focus."),
  educationalLevel: z.string().optional().describe("The user's current educational level."),
});
export type GenerateAptitudeTestInput = z.infer<typeof GenerateAptitudeTestInputSchema>;

const AptitudeQuestionSchema = z.object({
    questionText: z.string().describe("The text of the question."),
    options: z.array(z.string()).min(4).max(4).describe("4 possible answers."),
    correctAnswer: z.string().describe("The correct answer from the options."),
    explanation: z.string().describe("Why this answer is correct."),
});

const GenerateAptitudeTestOutputSchema = z.object({
  testTitle: z.string().describe("A professional title for the test."),
  questions: z.array(AptitudeQuestionSchema).describe("An array of 40 aptitude questions."),
});
export type GenerateAptitudeTestOutput = z.infer<typeof GenerateAptitudeTestOutputSchema>;

const aptitudePrompt = ai.definePrompt({
  name: 'generateAptitudeTestPrompt',
  model: 'googleai/gemini-2.5-flash',
  input: {schema: GenerateAptitudeTestInputSchema},
  output: {schema: GenerateAptitudeTestOutputSchema},
  prompt: `You are Zia, an expert HR Consultant and Psychometric Tester. Your task is to generate a comprehensive 40-question aptitude test for a candidate.

### CRITICAL INSTRUCTION:
You **MUST** generate exactly 40 questions. Do not stop early. Do not provide a summary. Provide only the 40 questions in the required format.

### CONTEXT:
- **Target Industry/Role**: {{{industry}}}
- **Candidate Level**: {{#if educationalLevel}}{{{educationalLevel}}}{{else}}Professional{{/if}}
{{#if cvContent}}
- **Candidate Background**: 
\`\`\`
{{{cvContent}}}
\`\`\`
{{/if}}

### TEST STRUCTURE:
The test should consist of exactly 40 multiple-choice questions (MCQs) distributed as follows:
1. **Quantitative Reasoning (10 Qs)**: Numerical patterns, basic arithmetic, and data interpretation relevant to the industry.
2. **Verbal Reasoning (10 Qs)**: Comprehension, grammar, and logical deduction.
3. **Industry-Specific Knowledge (15 Qs)**: Technical or conceptual questions specific to **{{{industry}}}**.
4. **Abstract/Logical Reasoning (5 Qs)**: Visual patterns and logical sequencing.

### REQUIREMENTS:
- Each question must have exactly 4 distinct options.
- The difficulty should be tailored to the candidate's level.
- Provide a detailed explanation for every question.
- Ensure the questions are challenging but fair.

Generate the full 40-question test now.`,
  config: {
    maxOutputTokens: 16384,
  }
});

export async function generateAptitudeTest(input: GenerateAptitudeTestInput): Promise<GenerateAptitudeTestOutput> {
  const flow = ai.defineFlow(
    {
      name: 'generateAptitudeTestFlow',
      inputSchema: GenerateAptitudeTestInputSchema,
      outputSchema: GenerateAptitudeTestOutputSchema,
    },
    async (input) => {
      const {output} = await aptitudePrompt(input);
      if (!output) {
        throw new Error("Failed to generate aptitude test.");
      }
      return output;
    }
  );
  return flow(input);
}
