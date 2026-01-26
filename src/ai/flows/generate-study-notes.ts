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
    .enum(['Beginner', 'Intermediate', 'Expert', 'Secondary', 'Undergraduate', 'Masters', 'PhD'])
    .describe('The academic level of the study notes.'),
});

export type GenerateStudyNotesInput = z.infer<typeof GenerateStudyNotesInputSchema>;

const GenerateStudyNotesOutputSchema = z.object({
  notes: z.string().describe('The generated study notes in various formats.'),
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
      prompt: `You are an expert tutor, skilled in generating rich, multi-format study notes for any given topic and academic level.

  Generate comprehensive study notes for the topic: {{{topic}}}.
  The academic level is: {{{academicLevel}}}.

  ### Content Requirements:
  1.  **Well-Structured Text:** Use clear headings, bullet points, and bold text to organize the information.
  2.  **Data Tables:** Where appropriate, use Markdown tables to present data or comparisons.
  3.  **Chemical Equations:** Ensure all chemical equations are correctly formatted, using subscripts and superscripts where necessary (e.g., H₂O).
  4.  **Visuals & Videos:**
      *   Include links to relevant infographics or high-quality graphics to illustrate concepts.
      *   Embed links to relevant YouTube videos for visual explanations. Provide standard YouTube video URLs.
  5.  **Accuracy and Clarity:** The notes must be accurate, easy to understand, and tailored to the selected academic level.

  ### Concluding Action:
  After providing the notes, ALWAYS conclude your response with the following question on a new line:
  "Would you like me to generate flashcards, a quiz, or a slide deck from these notes?"`,
    });

    generateStudyNotesFlow = ai.defineFlow(
      {
        name: 'generateStudyNotesFlow',
        inputSchema: GenerateStudyNotesInputSchema,
        outputSchema: GenerateStudyNotesOutputSchema,
      },
      async input => {
        const {output} = await generateStudyNotesPrompt(input);
        return output!;
      }
    );
  }
  return generateStudyNotesFlow(input);
}
