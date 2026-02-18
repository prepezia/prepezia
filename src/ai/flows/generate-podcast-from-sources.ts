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
// @ts-ignore
import { Mp3Encoder } from 'lamejs';

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
  podcastAudio: z.string().describe('The generated podcast audio in base64 MP3 format.'),
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
    prompt: `You are a scriptwriter for an educational podcast called "Prep with Zia". Your task is to create a conversational script based on the provided source material.

    ### CHARACTERS:
    - **Zia:** The lead host. Energetic, enthusiastic, and great at making complex topics accessible.
    - **Jay:** The co-host. Analytical, inquisitive, and provides deeper insights and clarifying questions.

    ### INSTRUCTIONS:
    1.  Read the source material below.
    2.  Write a conversational podcast script between Zia and Jay that is approximately 300-400 words long.
    3.  The script should start with Zia saying: "Hey everyone, welcome back to Prep with Zia!"
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
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Achernar' },
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
    const podcastAudio = 'data:audio/mpeg;base64,' + (await toMp3(audioBuffer));

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

async function toMp3(
    pcmData: Buffer,
    channels = 1,
    sampleRate = 24000
  ): Promise<string> {
    const mp3Encoder = new Mp3Encoder(channels, sampleRate, 128); // 128 kbps bitrate
  
    // The TTS service returns 16-bit PCM, so we create an Int16Array view on the buffer
    const pcmAsInt16 = new Int16Array(pcmData.buffer, pcmData.byteOffset, pcmData.length / 2);
  
    const sampleBlockSize = 1152; // LAME-defined block size
    const mp3Data = [];
  
    for (let i = 0; i < pcmAsInt16.length; i += sampleBlockSize) {
      const sampleChunk = pcmAsInt16.subarray(i, i + sampleBlockSize);
      const mp3buf = mp3Encoder.encodeBuffer(sampleChunk);
      if (mp3buf.length > 0) {
        mp3Data.push(mp3buf);
      }
    }
  
    const mp3buf = mp3Encoder.flush();
    if (mp3buf.length > 0) {
      mp3Data.push(mp3buf);
    }
  
    // Concatenate all MP3 buffers
    const totalLength = mp3Data.reduce((acc, buf) => acc + buf.length, 0);
    const mp3Buffer = new Uint8Array(totalLength);
    let offset = 0;
    mp3Data.forEach(buf => {
      mp3Buffer.set(buf, offset);
      offset += buf.length;
    });
  
    return Buffer.from(mp3Buffer).toString('base64');
}
