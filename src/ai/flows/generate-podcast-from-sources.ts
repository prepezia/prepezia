'use server';

/**
 * @fileOverview A podcast generator AI agent that creates a two-person podcast script from various sources.
 *
 * - generatePodcastFromSources - A function that handles the podcast generation process.
 * - GeneratePodcastFromSourcesInput - The input type for the function.
 * - GeneratePodcastFromSourcesOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'zod';
import wav from 'wav';

const SourceSchema = z.object({
    type: z.enum(['pdf', 'text', 'audio', 'website', 'youtube', 'image', 'clipboard']),
    name: z.string(),
    url: z.string().optional(),
    data: z.string().optional(),
    contentType: z.string().optional(),
});

const GeneratePodcastFromSourcesInputSchema = z.object({
  context: z.enum(['note-generator', 'study-space']).describe("The context from which the request originates."),
  content: z.string().optional().describe("The source text content (for note generation)."),
  sources: z.array(SourceSchema).optional().describe("An array of sources (for study spaces)."),
});

export type GeneratePodcastFromSourcesInput = z.infer<typeof GeneratePodcastFromSourcesInputSchema>;

const GeneratePodcastFromSourcesOutputSchema = z.object({
  podcastScript: z.string().describe('The generated podcast script. It should be a dialog between Zia and Jay.'),
  podcastAudio: z.string().describe('The generated podcast audio in base64 WAV format.'),
});

export type GeneratePodcastFromSourcesOutput = z.infer<typeof GeneratePodcastFromSourcesOutputSchema>;


const podcastScriptPrompt = ai.definePrompt({
    name: 'podcastScriptPrompt',
    model: 'googleai/gemini-2.5-flash',
    input: {schema: GeneratePodcastFromSourcesInputSchema},
    output: {
        schema: z.object({
            script: z.string().describe('The full podcast script as a string, with speaker lines clearly marked as "Zia:" or "Jay:".')
        })
    },
    prompt: `You are a scriptwriter for an educational podcast called "Learn with Zia". Your task is to create a conversational script based on the provided source material.

    ### CHARACTERS:
    - **Zia:** The lead host. Energetic, enthusiastic, and great at making complex topics accessible.
    - **Jay:** The co-host. Analytical, inquisitive, and provides deeper insights and clarifying questions.

    ### INSTRUCTIONS:
    1.  Read the source material below.
    2.  Write a conversational podcast script between Zia and Jay that is approximately 300-400 words long.
    3.  The script should start with Zia saying: "Hey everyone, welcome back to Learn with Zia!"
    4.  Use banter, analogies, and frequent affirmations (e.g., "Exactly!", "That's a great point, Jay.", "Right, so...").
    5.  Ensure the conversation flows naturally and covers the key points from the source material.
    6.  The entire output must be just the script text, with each line prefixed by the speaker's name (e.g., "Zia: ...", "Jay: ...").

    ### SOURCE MATERIAL:
    {{#if content}}
    {{{content}}}
    {{else}}
      {{#each sources}}
    - {{this.name}}: {{#if this.data}}{{media url=this.data contentType=this.contentType}}{{else}}{{this.url}}{{/if}}
      {{/each}}
    {{/if}}
    `,
});

const generatePodcastFlow = ai.defineFlow(
  {
    name: 'generatePodcastFlow',
    inputSchema: GeneratePodcastFromSourcesInputSchema,
    outputSchema: GeneratePodcastFromSourcesOutputSchema,
  },
  async input => {
    // Step 1: Generate the script
    const {output} = await podcastScriptPrompt(input);
    if (!output || !output.script) {
        throw new Error("The AI model failed to generate a podcast script.");
    }
    const podcastScript = output.script;

    // Step 2: Generate the audio from the script
    const {media} = await ai.generate({
      model: 'googleai/gemini-2.5-flash-preview-tts',
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          multiSpeakerVoiceConfig: {
            speakerVoiceConfigs: [
              {
                speaker: 'Zia',
                voiceConfig: {prebuiltVoiceConfig: {voiceName: 'Achernar'}}, // Female voice
              },
              {
                speaker: 'Jay',
                voiceConfig: {prebuiltVoiceConfig: {voiceName: 'Algenib'}}, // Male voice
              },
            ],
          },
        },
      },
      prompt: podcastScript,
    });

    if (!media) {
      throw new Error('Text-to-speech conversion failed.');
    }

    const audioBuffer = Buffer.from(
      media.url.substring(media.url.indexOf(',') + 1),
      'base64'
    );
    const podcastAudio = 'data:audio/wav;base64,' + (await toWav(audioBuffer));

    return {
      podcastScript: podcastScript,
      podcastAudio: podcastAudio,
    };
  }
);

export async function generatePodcastFromSources(
  input: GeneratePodcastFromSourcesInput
): Promise<GeneratePodcastFromSourcesOutput> {
  return generatePodcastFlow(input);
}

async function toWav(
  pcmData: Buffer,
  channels = 1,
  rate = 24000,
  sampleWidth = 2
): Promise<string> {
  return new Promise((resolve, reject) => {
    const writer = new wav.Writer({
      channels,
      sampleRate: rate,
      bitDepth: sampleWidth * 8,
    });

    let bufs = [] as any[];
    writer.on('error', reject);
    writer.on('data', function (d) {
      bufs.push(d);
    });
    writer.on('end', function () {
      resolve(Buffer.concat(bufs).toString('base64'));
    });

    writer.write(pcmData);
    writer.end();
  });
}
