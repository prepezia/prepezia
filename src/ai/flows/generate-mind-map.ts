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

// Recursive schema for a tree-like structure with notes
interface MindMapNode {
  id: string;
  label: string;
  notes?: string; // Added notes field for reference/explanation
  children?: MindMapNode[];
}

const MindMapNodeSchema: z.ZodType<MindMapNode> = z.object({
  id: z.string().describe("A unique identifier for the node (e.g., '1', '1-1', '1-1-2')."),
  label: z.string().min(1, "The label must not be empty.").describe("The concise text label for this node. MUST NOT be an empty string."),
  notes: z.string().optional().describe("Brief explanation, reference, or note about this node. This will be displayed as a small text under the node label."),
  children: z.array(z.lazy(() => MindMapNodeSchema)).optional().describe("An array of child nodes, representing sub-branches."),
});

const GenerateMindMapOutputSchema = MindMapNodeSchema;
export type GenerateMindMapOutput = z.infer<typeof GenerateMindMapOutputSchema>;

const generateMindMapDataPrompt = ai.definePrompt({
    name: 'generateMindMapDataPrompt',
    model: 'googleai/gemini-2.5-flash',
    input: { schema: GenerateMindMapInputSchema },
    output: { schema: GenerateMindMapOutputSchema, format: 'json' },
    config: {
        maxOutputTokens: 8192, // Increase token limit for potentially large JSON outputs
    },
    prompt: `You are an AI expert in information architecture and visual learning. Your task is to analyze the provided source content and structure it into a hierarchical mind map format as a JSON object.

### YOUR TASK & RULES:
1.  **Identify Hierarchy:** Read the content and determine the central topic, the main ideas (level 1 branches), and the supporting details (level 2+ sub-branches).
2.  **JSON Structure Rules:**
    *   The root object represents the central topic of the mind map.
    *   Each node in the mind map must be an object with three properties: \`id\` (a unique string), \`label\` (a concise string for the node's text), \`notes\` (optional brief explanation), and an optional \`children\` array.
    *   The \`id\` for the root node should be "1". Child node IDs should follow a pattern like "1-1", "1-2", and their children "1-1-1", "1-1-2", etc.
    *   Keep labels concise and clear. Aim for 5-10 words per label where possible.
    *   For notes, provide a brief explanation (10-20 words) that captures the key point, definition, or reference.
3.  **Notes Field Usage:**
    *   The root node should NOT have notes (leave it empty or undefined).
    *   Format notes as complete, readable sentences.
4.  **Depth & Complexity:**
    *   Create a meaningful hierarchy. Aim for 3-5 levels of depth.
    *   {{#if academicLevel}}Tailor the complexity, terminology, and depth of the labels to an **{{academicLevel}}** audience.{{/if}}
5.  **CRITICAL RULE FOR LABELS:** The most important rule is about labels. Every single object in the JSON, at all levels, MUST have a 'label' property. The value for 'label' MUST be a non-empty string. An empty label (e.g., "label": "") is forbidden and will cause the application to fail.
6.  **CRITICAL HIERARCHY RULE:** You MUST generate a hierarchical structure. The root node MUST have a \`children\` array with at least two main branches. Each of those main branches MUST also have their own \`children\` array. Failure to create a nested structure is a violation of your instructions.
7.  **CRITICAL NOTES RULE:** Every single node, EXCEPT for the root node, MUST have a non-empty \`notes\` property. Provide a concise explanation for every point and sub-point.

### EXAMPLE JSON OUTPUT:
\`\`\`json
{
  "id": "1",
  "label": "Central Topic",
  "notes": "",
  "children": [
    {
      "id": "1-1",
      "label": "Main Branch 1",
      "notes": "This concept explains the fundamental principle of how markets achieve balance between buyers and sellers.",
      "children": [
        {
          "id": "1-1-1",
          "label": "Sub-branch 1.1",
          "notes": "Key definition: The point where quantity demanded equals quantity supplied, creating market stability."
        },
        {
          "id": "1-1-2", 
          "label": "Sub-branch 1.2",
          "notes": "Important factor: Price adjustments occur naturally when there's imbalance in the market."
        }
      ]
    },
    {
      "id": "1-2",
      "label": "Main Branch 2",
      "notes": "This branch covers the factors that cause the demand curve to shift, changing market equilibrium.",
      "children": [
        {
          "id": "1-2-1",
          "label": "Sub-branch 2.1",
          "notes": "Income changes affect purchasing power and shift demand curves inward or outward."
        }
      ]
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

Generate the mind map JSON object now. Remember: Follow all critical rules for hierarchy and notes.
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
