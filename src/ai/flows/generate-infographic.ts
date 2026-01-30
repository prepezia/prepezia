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


const visualStorytellerPrompt = ai.definePrompt({
    name: 'visualStorytellerPrompt',
    model: 'googleai/gemini-2.5-flash',
    input: { schema: GenerateInfographicInputSchema },
    output: { 
        schema: z.object({ 
            imagePrompt: z.string().describe("A highly detailed, descriptive prompt for an image generation model to create a complete infographic."),
        }) 
    },
    prompt: `You are an expert science communicator and graphic designer. Your task is to analyze the provided source material and create a detailed prompt for an image generation AI (like Imagen or Midjourney) to create a high-quality, educational infographic similar to the standards of Google's NotebookLM.

### ANALYSIS & CONCEPTUALIZATION:
1.  **Identify the Core Narrative:** Read the source material and understand the central process, concept, or story. Is it a lifecycle? A comparison? A cause-and-effect relationship?
2.  **Design a Visual Metaphor:** Conceptualize a single, cohesive visual that can tie the whole story together. For a biological process, this might be a flowing diagram showing different stages in the body. For a historical event, it might be a timeline with interconnected events. Avoid simple, disconnected boxes.
3.  **Break Down into Key Visual Elements:** Describe the individual components of your visual metaphor. For each element, specify what it is, where it should be placed, and how it connects to other elements (e.g., "A large, detailed red blood cell is in the center, with arrows pointing from it to show its path.").
4.  **Integrate Text Clearly:** For each visual element, write the exact, concise text (headings and short descriptions) that should be placed near it. The text must be minimal and support the visual, not dominate it.
5.  **Data Visualization (if applicable):** If the source contains data, describe a simple chart or graph (e.g., bar chart, gauge) to represent it, including labels and values.

### PROMPT GENERATION RULES:
Based on your concept, generate a single, comprehensive prompt for the image AI. This prompt MUST include:
-   **Overall Style:** "A clean, modern, professional educational infographic. Vector art style with realistic detail. White background."
-   **Visual Flow:** A clear description of the central visual metaphor and the arrangement of all elements.
-   **Specific Elements:** Detailed descriptions of each icon, diagram, or illustration.
-   **Text Integration:** The exact text content for each label, heading, and description, and where it should be placed.
-   **CRITICAL TEXT LEGIBILITY:** A command like: "CRITICAL: All text must be perfectly legible, horizontal, and rendered in a clean, sans-serif font like Arial or Helvetica. Ensure high contrast between text and background. There must be NO distorted, curved, or unreadable text."
-   **Branding:** "Include a small, discreet 'Learn with Temi' text mark in the bottom-left corner."

### SOURCE CONTENT:
{{#if content}}
{{{content}}}
{{else}}
  {{#each sources}}
    - {{this.name}}: {{#if this.data}}{{media url=this.data contentType=this.contentType}}{{else}}{{this.url}}{{/if}}
  {{/each}}
{{/if}}

Generate the detailed image prompt now.
`,
});

const generateInfographicFlow = ai.defineFlow({
    name: 'generateInfographicFlow',
    inputSchema: GenerateInfographicInputSchema,
    outputSchema: GenerateInfographicOutputSchema,
},
async input => {
    // Step 1: Generate the detailed image prompt from the storyteller AI.
    const { output } = await visualStorytellerPrompt(input);
    if (!output?.imagePrompt) {
        throw new Error("The AI failed to generate a visual concept (image prompt).");
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
