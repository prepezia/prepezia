
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
 * STRATEGY: NotebookLM Style requires structured text blocks.
 * We use Gemini 2.5 Flash to create a "Visual Blueprint" first.
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
                header: z.string().describe("3-word max bold title"),
                body: z.string().describe("One very short simple sentence explanation"),
                icon: z.string().describe("Simple object to represent this (e.g. 'a lightbulb')")
            })).max(4) // Limiting to 4 modules ensures the text is large enough to be legible
        }) 
    },
    prompt: `
        You are a Professional Educational Illustrator. Your task is to extract the core logic from the source material and design a "NotebookLM-style" infographic layout.

        ### SOURCE CONTENT:
        {{#if content}}
            {{{content}}}
        {{else}}
            {{#each sources}}
- {{this.name}}: {{#if this.data}}{{media url=this.data contentType=this.contentType}}{{else}}{{{this.url}}}{{/if}}
            {{/each}}
        {{/if}}

        INSTRUCTIONS:
        1. Summarize the topic into 4 distinct, logical modules.
        2. For each module, provide a bold Header and a 1-sentence Explanation.
        3. Ensure the text is simple enough for an image model to render correctly.
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
     * THE NOTEBOOKLM PROMPT:
     * - Uses 2D Flat Vector style (prevents 3D distortion).
     * - Enforces horizontal text.
     * - Uses white space for professional clarity.
     */
    const imagePrompt = `
        A professional, educational infographic in **Flat Design 2D style**.
        Topic: "${topic}".
        
        LAYOUT: A clean ${blueprint.layout} on a stark white background (#FFFFFF).
        
        STRUCTURE:
        The image must contain 4 distinct, evenly spaced horizontal modules. 
        Each module must feature:
        1. A simple, flat vector icon: ${blueprint.modules.map(m => m.icon).join(", ")}.
        2. A BOLD HEADER: ${blueprint.modules.map(m => `"${m.header.toUpperCase()}"`).join(", ")}.
        3. A SHORT EXPLANATION: ${blueprint.modules.map(m => `"${m.body}"`).join(", ")}.

        AESTHETIC RULES:
        - All text must be rendered in a clean, legible sans-serif font.
        - Text must be horizontal (no 3D angles).
        - Use high contrast: Dark charcoal (#333333) text on the white background.
        - Primary accent colors: Royal Blue and Slate.
        - NO 3D, NO gradients, NO shadows. Minimalist and spacious.
        
        Branding: A tiny 'Learn with Temi' text label in the bottom corner.
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
