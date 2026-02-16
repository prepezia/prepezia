
'use server';
/**
 * @fileOverview A flow to generate a title for a chat session.
 *
 * - generateChatTitle - A function that handles chat title generation.
 */

import {ai} from '@/ai/genkit';
import {z} from 'zod';

const ChatMessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string(),
});

const GenerateChatTitleInputSchema = z.object({
  history: z.array(ChatMessageSchema).describe('The conversation history.'),
});
export type GenerateChatTitleInput = z.infer<typeof GenerateChatTitleInputSchema>;


const GenerateChatTitleOutputSchema = z.object({
  title: z.string().describe('A short, concise title for the chat session (3-5 words).'),
});
export type GenerateChatTitleOutput = z.infer<typeof GenerateChatTitleOutputSchema>;


const generateChatTitlePrompt = ai.definePrompt({
    name: 'generateChatTitlePrompt',
    model: 'googleai/gemini-2.5-flash',
    input: {schema: GenerateChatTitleInputSchema},
    output: {schema: GenerateChatTitleOutputSchema},
    prompt: `Based on the following conversation history, generate a short, concise title for the chat session (3-5 words). The title should capture the main topic of the conversation.

### Conversation History:
{{#each history}}
- **{{role}}**: {{{content}}}
{{/each}}

Generate a short (3-5 words) title now.`,
});

export async function generateChatTitle(input: GenerateChatTitleInput): Promise<GenerateChatTitleOutput> {
  const generateChatTitleFlow = ai.defineFlow(
    {
      name: 'generateChatTitleFlow',
      inputSchema: GenerateChatTitleInputSchema,
      outputSchema: GenerateChatTitleOutputSchema,
    },
    async ({history}) => {
      const {output} = await generateChatTitlePrompt({history});
      if (!output) {
        throw new Error("The AI model failed to produce a valid response.");
      }
      return output;
    }
  );
  return generateChatTitleFlow(input);
}
