'use server';
/**
 * @fileOverview A flow to generate a mind map data structure from content.
 * - generateMindMap - A function that handles mind map data generation.
 * - GenerateMindMapInput - The input type.
 * - GenerateMindMapOutput - The return type.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

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


// Recursive schema for a tree-like structure
interface MindMapNode {
  id: string;
  label: string;
  children?: MindMapNode[];
}

const MindMapNodeSchema: z.ZodType<MindMapNode> = z.object({
  id: z.string().describe("A unique identifier for the node (e.g., '1', '1-1', '1-1-2')."),
  label: z.string().describe("The concise text label for this node."),
  children: z.array(z.lazy(() => MindMapNodeSchema)).optional().describe("An array of child nodes, representing sub-branches."),
});

const GenerateMindMapOutputSchema = MindMapNodeSchema;
export type GenerateMindMapOutput = z.infer<typeof GenerateMindMapOutputSchema>;


const generateMindMapDataPrompt = ai.definePrompt({
    name: 'generateMindMapDataPrompt',
    model: 'googleai/gemini-2.5-flash',
    input: { schema: GenerateMindMapInputSchema },
    output: { schema: GenerateMindMapOutputSchema },
    prompt: `You are an AI expert in information architecture and visual learning. Your task is to analyze the provided source content and structure it into a hierarchical mind map format as a JSON object.

### YOUR TASK:
1.  **Identify Hierarchy:** Read the content and determine the central topic, the main ideas (level 1 branches), and the supporting details (level 2+ sub-branches).
2.  **Generate JSON:** Output a single JSON object that represents this mind map structure. The output must be ONLY the JSON object, with no surrounding text or markdown formatting.
3.  **JSON Structure Rules:**
    *   The root object represents the central topic of the mind map.
    *   Each node in the mind map must be an object with three properties: \`id\` (a unique string), \`label\` (a concise string for the node's text), and an optional \`children\` array.
    *   The \`id\` for the root node should be "1". Child node IDs should follow a pattern like "1-1", "1-2", and their children "1-1-1", "1-1-2", etc.
    *   Keep labels concise and clear. Aim for 2-7 words per label where possible.
    *   Create a meaningful hierarchy. Don't make the mind map too flat or too deep. Aim for 2-4 levels of depth.

### EXAMPLE JSON OUTPUT:
\`\`\`json
{
  "id": "1",
  "label": "Central Topic",
  "children": [
    {
      "id": "1-1",
      "label": "Main Branch 1",
      "children": [
        {
          "id": "1-1-1",
          "label": "Sub-branch 1.1",
          "children": [
            {
              "id": "1-1-1-1",
              "label": "Detail 1.1.1"
            }
          ]
        },
        {
          "id": "1-1-2",
          "label": "Sub-branch 1.2"
        }
      ]
    },
    {
      "id": "1-2",
      "label": "Main Branch 2"
    }
  ]
}
\`\`\`

### SOURCE CONTENT:
{{#if content}}
{{{content}}}
{{else}}
  {{#each sources}}
- {{this.name}}: {{#if this.data}}{{media url=this.data contentType=this.contentType}}{{else}}{{this.url}}{{/if}}
  {{/each}}
{{/if}}

Generate the mind map as a single JSON object now.
`,
});

const generateMindMapFlow = ai.defineFlow({
    name: 'generateMindMapFlow',
    inputSchema: GenerateMindMapInputSchema,
    outputSchema: GenerateMindMapOutputSchema,
},
async (input) => {
    const { output } = await generateMindMapDataPrompt(input);
    if (!output) {
        throw new Error("The AI failed to generate the mind map data.");
    }
    return output;
});

export async function generateMindMap(input: GenerateMindMapInput): Promise<GenerateMindMapOutput> {
  return generateMindMapFlow(input);
}
