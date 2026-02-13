'use server';

/**
 * @fileOverview This file defines a Genkit flow for generating study notes based on a topic and academic level.
 *
 * - generateStudyNotes - The main function to generate study notes.
 * - GenerateStudyNotesInput - The input type for the generateStudyNotesInput function.
 * - GenerateStudyNotesOutput - The output type for the generateStudyNotesOutput function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateStudyNotesInputSchema = z.object({
  topic: z.string().describe('The topic for which to generate study notes.'),
  academicLevel: z
    .enum(['Beginner', 'Intermediate', 'Expert', 'Secondary', 'Undergraduate', 'Masters', 'PhD', 'Junior High (JHS/BECE)', 'Senior High (SHS/WASSCE)', 'Professional', 'Other'])
    .describe('The academic level of the study notes.'),
});

export type GenerateStudyNotesInput = z.infer<typeof GenerateStudyNotesInputSchema>;

const GenerateStudyNotesOutputSchema = z.object({
  notes: z.string().describe('The generated study notes in various formats.'),
  nextStepsPrompt: z.string().describe('A question prompting the user for next steps like generating a quiz or flashcards.')
});

export type GenerateStudyNotesOutput = z.infer<typeof GenerateStudyNotesOutputSchema>;

let generateStudyNotesFlow: any;

export async function generateStudyNotes(
  input: GenerateStudyNotesInput
): Promise<GenerateStudyNotesOutput> {
  if (!generateStudyNotesFlow) {
    const generateStudyNotesPrompt = ai.definePrompt({
      name: 'generateStudyNotesPrompt',
      model: 'googleai/gemini-2.5-flash',
      input: {schema: GenerateStudyNotesInputSchema},
      output: {schema: GenerateStudyNotesOutputSchema},
      system: "You are an expert tutor, renowned for your ability to break down complex topics into detailed, well-structured, and easy-to-understand study materials. Your primary goal is to create content that is both comprehensive and tailored to the learner's academic level.",
      prompt: `Generate **highly detailed and comprehensive** study notes for the topic: {{{topic}}}.
The academic level is: {{{academicLevel}}}.

The notes should be thorough enough for a student to use as a primary study resource, covering all key concepts, sub-topics, important definitions, and relevant examples.

### Content Requirements:
1.  **Structure and Depth:** Use clear headings, subheadings, bullet points, and bold text to create a logical hierarchy. Start with an introduction and progress through the topic systematically.
2.  **Mandatory Page Breaks:** You MUST break up long content into multiple pages for readability. To do this, insert a horizontal rule (\`---\`) on its own line to indicate a page break. Use this to separate major sections. All generated notes MUST contain at least one page break.
3.  **Rich Formatting:** Where appropriate, use Markdown tables to present data or comparisons. Ensure all scientific or mathematical notation (like chemical equations H₂O) is correctly formatted.
4.  **Accuracy and Clarity:** The notes must be accurate, easy to understand, and precisely tailored to the selected academic level.
5.  **Next Steps**: After generating the notes, formulate a question for the user about what they would like to do next. For example: "Would you like me to generate flashcards, a quiz, or a slide deck from these notes?" and place it in the 'nextStepsPrompt' field.`,
      config: {
          maxOutputTokens: 8192,
      },
    });

    generateStudyNotesFlow = ai.defineFlow(
      {
        name: 'generateStudyNotesFlow',
        inputSchema: GenerateStudyNotesInputSchema,
        outputSchema: GenerateStudyNotesOutputSchema,
      },
      async (input: GenerateStudyNotesInput) => {
        const {output} = await generateStudyNotesPrompt(input);
        if (!output) {
            throw new Error("Failed to generate study notes text.");
        }

        return {
            notes: output.notes,
            nextStepsPrompt: output.nextStepsPrompt,
        };
      }
    );
  }
  return generateStudyNotesFlow(input);
}
