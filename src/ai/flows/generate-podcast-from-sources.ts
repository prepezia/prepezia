'use server';

/**
 * @fileOverview A podcast generator AI agent that creates a two-person podcast script from uploaded sources.
 *
 * - generatePodcastFromSources - A function that handles the podcast generation process.
 * - GeneratePodcastFromSourcesInput - The input type for the generatePodcastFromSources function.
 * - GeneratePodcastFromSourcesOutput - The return type for the generatePodcastFromSources function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import wav from 'wav';

const GeneratePodcastFromSourcesInputSchema = z.object({
  sources: z
    .array(z.string())
    .describe(
      'An array of source URLs (PDFs, text files, MP3 audio files, Website URLs, YouTube links).' 
    ),
});
export type GeneratePodcastFromSourcesInput = z.infer<
  typeof GeneratePodcastFromSourcesInputSchema
>;

const GeneratePodcastFromSourcesOutputSchema = z.object({
  podcastScript: z.string().describe('The generated podcast script in JSON format.'),
  podcastAudio: z.string().describe('The generated podcast audio in base64 WAV format.'),
});
export type GeneratePodcastFromSourcesOutput = z.infer<
  typeof GeneratePodcastFromSourcesOutputSchema
>;

export async function generatePodcastFromSources(
  input: GeneratePodcastFromSourcesInput
): Promise<GeneratePodcastFromSourcesOutput> {
  return generatePodcastFromSourcesFlow(input);
}

const podcastScriptPrompt = ai.definePrompt({
  name: 'podcastScriptPrompt',
  input: {schema: GeneratePodcastFromSourcesInputSchema},
  output: {schema: z.string()},
  prompt: `Act as two hosts, Temi (energetic, lead) and Jay (analytical, supporting). Turn the following uploaded sources into a 10-minute \"Deep Dive\" conversation. Use banter, analogies, and frequent affirmations like \"Exactly\" or \"Right.\" Start with: \"Hey everyone, welcome back to Learn with Temi!\" Output the script in JSON format with speaker tags.\n\nSources:\n{{#each sources}}- {{{this}}}\n{{/each}}`,
});

const generatePodcastFromSourcesFlow = ai.defineFlow(
  {
    name: 'generatePodcastFromSourcesFlow',
    inputSchema: GeneratePodcastFromSourcesInputSchema,
    outputSchema: GeneratePodcastFromSourcesOutputSchema,
  },
  async input => {
    const {output: podcastScript} = await podcastScriptPrompt(input);

    const ttsPrompt = podcastScript!.toString();
    const {media} = await ai.generate({
      model: 'googleai/gemini-2.5-flash-preview-tts',
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          multiSpeakerVoiceConfig: {
            speakerVoiceConfigs: [
              {
                speaker: 'Temi',
                voiceConfig: {prebuiltVoiceConfig: {voiceName: 'Algenib'}},
              },
              {
                speaker: 'Jay',
                voiceConfig: {prebuiltVoiceConfig: {voiceName: 'Achernar'}},
              },
            ],
          },
        },
      },
      prompt: ttsPrompt,
    });

    if (!media) {
      throw new Error('no media returned');
    }

    const audioBuffer = Buffer.from(
      media.url.substring(media.url.indexOf(',') + 1),
      'base64'
    );
    const podcastAudio = 'data:audio/wav;base64,' + (await toWav(audioBuffer));

    return {
      podcastScript: podcastScript!,
      podcastAudio: podcastAudio,
    };
  }
);

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
