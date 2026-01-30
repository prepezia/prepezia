
'use server';

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const SourceSchema = z.object({
    type: z.enum(['pdf', 'text', 'audio', 'website', 'youtube', 'image', 'clipboard']),
    name: z.string(),
    url: z.string().optional(),
    data: z.string().optional(),
    contentType: z.string().optional(),
});

const GenerateInfographicInputSchema = z.object({
  context: z.enum(['note-generator', 'study-space']).describe("The context from which the request originates."),
  topic: z.string().optional().describe("The topic of the content (used in 'note-generator' context)."),
  academicLevel: z.string().optional().describe("The academic level (used in 'note-generator' context)."),
  content: z.string().optional().describe("The source text content (for note generation)."),
  sources: z.array(SourceSchema).optional().describe("An array of sources (for study spaces)."),
});
export type GenerateInfographicInput = z.infer<typeof GenerateInfographicInputSchema>;


const GenerateInfographicOutputSchema = z.object({
  imageUrl: z.string().describe("The data URI of the generated infographic image."),
  prompt: z.string().describe("The prompt used to generate the image for debugging purposes.")
});
export type GenerateInfographicOutput = z.infer<typeof GenerateInfographicOutputSchema>;

const designInfographicMetaPrompt = ai.definePrompt({
    name: 'designInfographicMetaPrompt',
    model: 'googleai/gemini-2.5-flash',
    input: { schema: GenerateInfographicInputSchema },
    output: {
        schema: z.object({
            imagePrompt: z.string().describe("A highly detailed, descriptive prompt for an image generation model to create a professional infographic. This prompt should describe the layout, colors, icons, text, and flow of information. It MUST include a CRITICAL INSTRUCTION for the image model to ensure all text is perfectly legible, horizontal, and rendered in a clean, sans-serif font. It should also include a request for a 'Learn with Temi' mark in the bottom-left corner.")
        })
    },
    prompt: `You are an expert Visual Storyteller and Science Communicator with over 20 years of experience, specializing in creating designs for educational content similar to Google's NotebookLM. Your task is to analyze the provided source material and generate a "meta-prompt" – a detailed set of instructions for a powerful text-to-image AI model (like Imagen 4.0) to create a professional, clear, and visually engaging infographic.

### YOUR DESIGN PHILOSOPHY:
1.  **Narrative Flow:** Don't just list facts. Create a visual story that flows logically. Use arrows, connecting lines, or a central metaphor to guide the viewer's eye.
2.  **Clarity Above All:** Prioritize clear, legible text and simple, relevant icons.
3.  **Professional Aesthetics:** Use a clean layout, a professional color palette (deep blues, purples, with accents), and a prominent title.

### META-PROMPT REQUIREMENTS:
The prompt you generate for the image model MUST include the following instructions:
1.  A main, overarching title for the infographic.
2.  A description of the overall layout (e.g., "a central flowing diagram", "a top-to-bottom flowchart", "a comparison table").
3.  Detailed descriptions for each visual element, its placement, and how it connects to others.
4.  The **exact, minimal text** to be placed clearly alongside each visual component.
5.  A **CRITICAL INSTRUCTION** section for the image model, demanding that **ALL TEXT MUST BE PERFECTLY LEGIBLE, HORIZONTAL, and rendered in a clean, sans-serif font like Arial or Helvetica. There must be NO distorted, curved, or unreadable text. Prioritize text clarity above all else.**
6.  A small, discreet 'Learn with Temi' text mark in the bottom-left corner.
7.  Specify a clean white background.

### SOURCE CONTENT:
{{#if content}}
{{{content}}}
{{else}}
  {{#each sources}}
- {{this.name}}: {{#if this.data}}{{media url=this.data contentType=this.contentType}}{{else}}{{this.url}}{{/if}}
  {{/each}}
{{/if}}

Generate the meta-prompt now.
`,
});


const generateInfographicFlow = ai.defineFlow({
    name: 'generateInfographicFlow',
    inputSchema: GenerateInfographicInputSchema,
    outputSchema: GenerateInfographicOutputSchema,
},
async (input) => {
    // Step 1: Generate the detailed "meta-prompt" for the image model.
    const { output } = await designInfographicMetaPrompt(input);
    if (!output?.imagePrompt) {
        throw new Error("The AI failed to generate the design prompt for the infographic.");
    }
    const imagePrompt = output.imagePrompt;

    // Step 2: Use the generated prompt to create the image.
    const { media } = await ai.generate({
        model: 'googleai/imagen-4.0-fast-generate-001',
        prompt: imagePrompt,
    });

    if (!media?.url) {
        throw new Error('Image generation failed.');
    }

    return {
        imageUrl: media.url,
        prompt: imagePrompt, // Return the generated prompt for debugging.
    };
});

export async function generateInfographic(input: GenerateInfographicInput): Promise<GenerateInfographicOutput> {
  return generateInfographicFlow(input);
}
