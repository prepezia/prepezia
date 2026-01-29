
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
    imageUrl: z.string().url().describe("The data URI of the generated infographic image."),
    prompt: z.string().describe("The prompt that was used to generate the image."),
});

export type GenerateInfographicOutput = z.infer<typeof GenerateInfographicOutputSchema>;

/**
 * STRATEGY: To improve text legibility, we use a two-step process.
 * 1. An LLM creates a "Visual Blueprint" with extremely simple text.
 * 2. This blueprint is used to construct a highly-structured prompt for an image model.
 */
const infographicSummaryPrompt = ai.definePrompt({
    name: 'infographicSummaryPrompt',
    model: 'googleai/gemini-2.5-flash',
    input: { schema: GenerateInfographicInputSchema },
    output: { 
        schema: z.object({ 
            title: z.string(),
            layout: z.enum(['Vertical List', 'Z-Pattern', 'Grid']),
            modules: z.array(z.object({
                header: z.string().describe("A 2-3 word bold title for a module."),
                body: z.string().describe("A 5-word maximum phrase for the body. This is NOT a full sentence."),
                icon: z.string().describe("A simple, single object to represent this module (e.g. 'a lightbulb', 'a human kidney').")
            })).max(4)
        }) 
    },
    prompt: `
        You are a Professional Educational Illustrator. Your task is to extract the core logic from the source material and design a "Visual Blueprint" for a simple infographic.

        ### SOURCE CONTENT:
        {{#if content}}
            {{{content}}}
        {{else}}
            {{#each sources}}
- {{this.name}}: {{#if this.data}}{{media url=this.data contentType=this.contentType}}{{else}}{{{this.url}}}{{/if}}
            {{/each}}
        {{/if}}

        INSTRUCTIONS:
        1. Summarize the topic into 3 or 4 distinct, logical modules.
        2. For each module, provide:
            *   **header**: A 2-3 word bold title.
            *   **body**: A very short phrase (max 5 words). This must NOT be a full sentence.
            *   **icon**: A simple, single object for an icon (e.g., 'a human kidney').
        3. The text MUST be extremely simple and short to ensure an image model can render it legibly.
    `,
});

const generateInfographicFlow = ai.defineFlow({
    name: 'generateInfographicFlow',
    inputSchema: GenerateInfographicInputSchema,
    outputSchema: GenerateInfographicOutputSchema,
},
async input => {
    // 1. Create the structured data for the image
    const { output: blueprint } = await infographicSummaryPrompt(input);
    
    if (!blueprint) {
        throw new Error("Failed to generate design blueprint.");
    }

    const topic = input.topic || blueprint.title;

    /**
     * THE NOTEBOOKLM PROMPT (REVISED FOR LEGIBILITY):
     * - Uses a modular structure to describe each section individually.
     * - Enforces 2D Flat Vector style and horizontal text.
     * - Specifies high-contrast colors and generous white space.
     */
    const imagePrompt = `
        A professional, educational infographic in a **Flat Design 2D vector style**.
        Topic: "${topic}".
        The infographic must have a stark white background (#FFFFFF).
        
        The image must contain these ${blueprint.modules.length} distinct, evenly spaced horizontal modules in a clean ${blueprint.layout}:

        ${blueprint.modules.map((m, i) => `
        Module ${i + 1}:
        - Icon: A simple, flat vector icon of: ${m.icon}.
        - Header Text: The BOLD, sans-serif text "${m.header.toUpperCase()}".
        - Body Text: The smaller, sans-serif text "${m.body}".
        `).join('\n')}

        AESTHETIC RULES:
        - All text must be perfectly legible, horizontal, and clean. NO distorted or angled text.
        - Use high contrast: Dark charcoal (#333333) text on the white background.
        - Use Royal Blue and Slate for minimal color accents on icons only.
        - ABSOLUTELY NO 3D, NO gradients, NO shadows. The design must be flat and minimalist.
        - Leave generous white space between modules.
        
        Include a tiny 'Learn with Temi' text label in the bottom right corner.
    `;

    // 2. Generate the image using the highly structured prompt
    const { media } = await ai.generate({
        model: 'googleai/imagen-4.0-fast-generate-001',
        prompt: imagePrompt,
    });

    if (!media?.url) {
        throw new Error('Image generation failed.');
    }

    return {
        imageUrl: media.url,
        prompt: imagePrompt,
    };
});

export async function generateInfographic(input: GenerateInfographicInput): Promise<GenerateInfographicOutput> {
    return generateInfographicFlow(input);
}
