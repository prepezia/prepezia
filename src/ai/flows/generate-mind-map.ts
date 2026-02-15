'use server';
/**
 * @fileOverview A flow to generate a mind map from content.
 * - generateMindMap - A function that handles mind map generation.
 */

import {ai} from '@/ai/genkit';
import {z} from 'zod';

// Schema for a single node in the mind map
const MindMapNodeSchema: z.ZodType<any> = z.lazy(() => z.object({
    title: z.string().describe("The concise title for this node of the mind map."),
    note: z.string().describe("A brief, one-sentence explanation of the node's topic."),
    children: z.array(MindMapNodeSchema).optional().describe("An array of child nodes. Omit this property entirely if there are no children."),
}));

const SourceSchema = z.object({
    type: z.enum(['pdf', 'text', 'audio', 'website', 'youtube', 'image', 'clipboard']),
    name: z.string(),
    url: z.string().optional(),
    data: z.string().optional(),
    contentType: z.string().optional(),
});

const GenerateMindMapInputSchema = z.object({
  context: z.enum(['note-generator', 'study-space']).describe("The context from which the request originates."),
  topic: z.string().optional().describe("The topic of the content (used in 'note-generator' context)."),
  academicLevel: z.string().optional().describe("The academic level (used in 'note-generator' context)."),
  content: z.string().optional().describe("The source text content (for note generation)."),
  sources: z.array(SourceSchema).optional().describe("An array of sources (for study spaces)."),
});
export type GenerateMindMapInput = z.infer<typeof GenerateMindMapInputSchema>;

const GenerateMindMapOutputSchema = z.object({
  mindMap: MindMapNodeSchema.describe("The root node of the generated mind map."),
});
export type GenerateMindMapOutput = z.infer<typeof GenerateMindMapOutputSchema>;

const generateMindMapPrompt = ai.definePrompt({
  name: 'generateMindMapPrompt',
  model: 'googleai/gemini-2.5-flash',
  input: {schema: GenerateMindMapInputSchema},
  output: {schema: GenerateMindMapOutputSchema},
  prompt: `You are an AI expert in structuring complex information into clear, hierarchical mind maps.

### TASK:
Convert the provided source content into a structured mind map.

### CRITICAL RULES:
1.  **HIERARCHY:** You **MUST** create a hierarchical structure with a single root node. This root node must have at least 2-4 main child nodes (branches). Each of these main branches **MUST** also have their own child nodes (sub-branches). The mind map should be at least 3 levels deep.
2.  **NOTES:** For **EVERY SINGLE NODE** you create (including the root and all children), you **MUST** provide a concise, one-sentence explanation in the 'note' field.
3.  **CHILDREN PROPERTY:** The 'children' array must ONLY contain valid node objects (with 'title' and 'note'). If a node has no sub-topics, you **MUST OMIT** the 'children' property for that node entirely. Do not include an empty \`children: []\` array, and do not include \`null\` or empty \`{}\` objects as elements in the \`children\` array.

### CONTEXT:
{{#if topic}}
- Topic: {{{topic}}}
- Academic Level: {{{academicLevel}}}
{{else}}
- The mind map should be a comprehensive overview of the provided study space sources.
{{/if}}

### SOURCE CONTENT:
\`\`\`
{{#if content}}
{{{content}}}
{{else}}
  {{#each sources}}
- {{this.name}}: {{#if this.data}}{{media url=this.data contentType=this.contentType}}{{else}}{{this.url}}{{/if}}
  {{/each}}
{{/if}}
\`\`\`

Generate the complete mind map now, starting with the root node.
`,
});

const generateMindMapFlow = ai.defineFlow({
    name: 'generateMindMapFlow',
    inputSchema: GenerateMindMapInputSchema,
    outputSchema: GenerateMindMapOutputSchema,
  },
  async input => {
    const {output} = await generateMindMapPrompt(input);
    return output!;
  }
);

export async function generateMindMap(input: GenerateMindMapInput): Promise<GenerateMindMapOutput> {
  return generateMindMapFlow(input);
}
