'use server';
/**
 * @fileOverview A flow to generate a slide deck from content.
 * - generateSlideDeck - A function that handles slide deck generation.
 * - GenerateSlideDeckInput - The input type.
 * - GenerateSlideDeckOutput - The return type.
 */

import {ai} from '@/ai/genkit';
import {z} from 'zod';

const GenerateSlideDeckInputSchema = z.object({
  context: z.enum(['note-generator', 'study-space']).describe("The context from which the request originates."),
  topic: z.string().optional().describe("The topic of the content (used in 'note-generator' context)."),
  academicLevel: z.string().optional().describe("The academic level (used in 'note-generator' context)."),
  content: z.string().describe("The source text content (notes or combined sources) to generate a slide deck from."),
});
export type GenerateSlideDeckInput = z.infer<typeof GenerateSlideDeckInputSchema>;

const SlideSchema = z.object({
  title: z.string().describe("The title for this slide."),
  content: z.string().describe("The main content for this slide, formatted as Markdown bullet points. Keep it concise."),
  speakerNotes: z.string().describe("Detailed speaker notes for the presenter to expand on the bullet points during the presentation."),
});

const GenerateSlideDeckOutputSchema = z.object({
  slides: z.array(SlideSchema).describe("An array of generated slides."),
  title: z.string().describe("The main title for the entire presentation.")
});
export type GenerateSlideDeckOutput = z.infer<typeof GenerateSlideDeckOutputSchema>;

const generateSlideDeckPrompt = ai.definePrompt({
  name: 'generateSlideDeckPrompt',
  model: 'googleai/gemini-2.5-flash',
  input: {schema: GenerateSlideDeckInputSchema},
  output: {schema: GenerateSlideDeckOutputSchema},
  prompt: `You are an AI expert in creating professional and engaging presentations. Your task is to convert the provided text content into a structured slide deck.

### INSTRUCTIONS:
1.  Read the content provided below and identify the main sections and key points.
2.  Create a logical flow for the presentation, starting with an introduction and ending with a conclusion.
3.  For each slide, you MUST provide:
    *   **title**: A clear and concise title for the slide.
    *   **content**: The main points for the slide, formatted as Markdown bullet points. This should be brief and easy to read.
    *   **speakerNotes**: More detailed information and talking points for the presenter to use. This is where you can elaborate on the slide's content.
4.  Generate a main title for the entire presentation.

{{#if topic}}
### CONTEXT:
This slide deck is for a student studying the topic of **"{{{topic}}}"** at the **"{{{academicLevel}}}"** level. The source content is a set of notes.
{{else}}
### CONTEXT:
This slide deck must be generated **strictly** from the provided source content from a Study Space. Do not include information outside of this text.
{{/if}}

### SOURCE CONTENT:
\`\`\`
{{{content}}}
\`\`\`

Generate the slide deck now.
`,
});

const generateSlideDeckFlow = ai.defineFlow({
    name: 'generateSlideDeckFlow',
    inputSchema: GenerateSlideDeckInputSchema,
    outputSchema: GenerateSlideDeckOutputSchema,
  },
  async input => {
    const {output} = await generateSlideDeckPrompt(input);
    return output!;
  }
);

export async function generateSlideDeck(input: GenerateSlideDeckInput): Promise<GenerateSlideDeckOutput> {
  return generateSlideDeckFlow(input);
}
