'use server';
/**
 * @fileOverview A conversational AI agent for guided learning.
 *
 * - guidedLearningChat - A function that handles a guided learning conversation.
 */

import {ai} from '@/ai/genkit';
import {z} from 'zod';

const ChatMessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string(),
});

const GuidedLearningChatInputSchema = z.object({
  question: z.string().describe("The user's question or topic for the learning session."),
  history: z.array(ChatMessageSchema).describe('The history of the conversation so far.'),
  mediaDataUri: z.string().optional().describe('An optional data URI for an image or file to provide context.'),
  mediaContentType: z.string().optional().describe('The MIME type of the media file.'),
  interests: z.array(z.string()).optional().describe("A list of the user's interests for personalized analogies."),
});
export type GuidedLearningChatInput = z.infer<typeof GuidedLearningChatInputSchema>;

const GuidedLearningChatOutputSchema = z.object({
  answer: z.string().describe("The AI's explanation or response to the user."),
  followUpQuestion: z.string().describe("An engaging follow-up question to guide the user's next step in learning."),
});
export type GuidedLearningChatOutput = z.infer<typeof GuidedLearningChatOutputSchema>;

const guidedLearningChatPrompt = ai.definePrompt({
  name: 'guidedLearningChatPrompt',
  model: 'googleai/gemini-2.5-flash',
  input: {schema: GuidedLearningChatInputSchema},
  output: {schema: GuidedLearningChatOutputSchema},
  prompt: `You are Zia, an expert AI tutor with a passion for making learning interactive and engaging. Your goal is to guide a user through a topic in a conversational way.

{{#if interests.length}}
### User's Personal Interests:
A list of topics the user is interested in: {{#each interests}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}.

**IMPORTANT:** When explaining complex topics, try to use analogies related to these interests to make your explanations more engaging and relatable for the user.
{{/if}}

### Your Task:
1.  Analyze the user's request based on their question, any media they provided, and the conversation history. If the history is empty, provide a warm welcome and a concise, engaging introduction to the main topic.
2.  Provide a clear, concise, and accurate explanation in the 'answer' field. Keep paragraphs short and easy to read.
3.  **CRITICAL:** After your explanation, craft an engaging 'followUpQuestion'. This question should identify 2-3 key concepts from your answer and prompt the user to choose which one they want to explore next. This guides the learning journey.

### Example Follow-up Questions:
- "We've touched on both the causes and effects of the Industrial Revolution. Would you like to dive deeper into the technological innovations that sparked it, or explore its social impact on city life?"
- "That covers the basics of photosynthesis. We can now look at the detailed chemical equation, or we could discuss how different types of plants have adapted this process. What sounds more interesting to you?"

{{#if mediaDataUri}}
### Context from provided media:
{{media url=mediaDataUri contentType=mediaContentType}}
{{/if}}

### User's Question/Topic:
{{{question}}}

### Conversation History:
{{#if history.length}}
{{#each history}}
- **{{role}}**: {{{content}}}
{{/each}}
{{else}}
This is the beginning of the conversation.
{{/if}}


Now, provide your expert answer and your guiding follow-up question.
`,
});

const guidedLearningChatFlow = ai.defineFlow(
  {
    name: 'guidedLearningChatFlow',
    inputSchema: GuidedLearningChatInputSchema,
    outputSchema: GuidedLearningChatOutputSchema,
  },
  async (input) => {
    const {output} = await guidedLearningChatPrompt(input);
    if (!output) {
      throw new Error("The AI model failed to produce a valid response.");
    }
    return output;
  }
);

export async function guidedLearningChat(input: GuidedLearningChatInput): Promise<GuidedLearningChatOutput> {
  return guidedLearningChatFlow(input);
}
