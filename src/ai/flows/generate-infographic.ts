
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
    prompt: `You are an expert infographic designer with a specialization in ultra-clear educational visuals. Your primary goal is to create a "meta-prompt" for a text-to-image AI model (like Imagen 4.0) that results in a professional, beautiful, and, most importantly, **perfectly readable** infographic. The final output's text clarity is the number one priority.

### YOUR DESIGN PRINCIPLES:
1.  **TEXT IS PARAMOUNT:** Text is not decoration. It must be treated as a primary design element. It must be high-contrast, horizontal, and use a bold, clean, sans-serif font.
2.  **MODULAR DESIGN:** Create a layout using clearly separated panels or sections (e.g., a 2x2 grid, a three-column layout). This helps the image model isolate text elements and render them cleanly. Avoid complex, overlapping designs.
3.  **VISUALS SUPPORT TEXT:** Icons and diagrams must be simple, clean, and directly support the text in their panel. They should not obstruct or compete with the text.
4.  **MINIMALISM:** Use a clean white background and a simple, professional color palette (e.g., shades of blue, gray, and one accent color). Less is more.

### META-PROMPT REQUIREMENTS:
Analyze the source content and generate a prompt for the image model that strictly follows these rules:
1.  **Layout:** Define a simple, modular layout (e.g., "A 2x2 grid infographic with a main title at the top.").
2.  **Content per Module:** For each module, specify:
    -   A very short \`HEADER\` (2-4 words).
    -   A concise \`BODY\` text (max 10-15 words).
    -   A description of a \`SIMPLE ICON\` that visually represents the text.
3.  **The Most Important Instruction:** The meta-prompt MUST end with the following **CRITICAL INSTRUCTION** section, verbatim. This is non-negotiable.

    "**CRITICAL INSTRUCTION FOR TEXT:** This is the most important part of the prompt. All text on this infographic **MUST** be perfectly legible, clear, and easy to read.
    -   Use a bold, modern, sans-serif font like Arial or Helvetica.
    -   All text must be perfectly horizontal.
    -   Ensure high contrast between the text and its background.
    -   Do not allow any text to be distorted, curved, misspelled, or unreadable.
    -   Render text as if it were a clean, vector overlay on the image. Prioritize text clarity above absolutely everything else. Failure to render text clearly is a failure of the entire task."
4.  **Branding:** Include a request for a small, discreet 'Learn with Temi' text mark in the bottom-left corner.

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
