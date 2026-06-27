import { ALL_FORMATS, Input, UrlSource } from "mediabunny"

/**
 * Returns the duration (in seconds) of an audio file. Works in the browser
 * (Studio), Node and Bun. Pass a `staticFile()` URL for local clips.
 */
export const getAudioDuration = async (src: string): Promise<number> => {
  const input = new Input({
    formats: ALL_FORMATS,
    source: new UrlSource(src, {
      getRetryDelay: () => null,
    }),
  })

  return input.computeDuration()
}
