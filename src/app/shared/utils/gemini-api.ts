import { Provider } from '@angular/core';
import { environment } from '../../../environments/environment';

const DEFAULT_DELAY = 2000;
const LOREM_IPSUM =
  'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.';

interface IGeminiApi {
  generateChatName(userQuery: string): Promise<string>;
  generateQueryResponse(userQuery: string): Promise<string>;
}

/**
 * Gemini API
 */
export class GeminiApi implements IGeminiApi {
  private _fetch = fetch.bind(globalThis);

  generateChatName(userQuery: string): Promise<string> {
    return this._generate(
      `Generate a single title that shouldn't exceed 4 words based on the following text: "${userQuery}". Output the title directly.`,
    );
  }

  generateQueryResponse(userQuery: string): Promise<string> {
    return this._generate(userQuery, true);
  }

  private async _generate(
    query: string,
    chat: boolean = false,
  ): Promise<string> {
    const path = !chat ? '' : '';
    const response = await this._fetch(environment.apiUrl + path, {
      method: 'POST',
      body: JSON.stringify({ "input": { "message": query, "user_id": "benjamin.francisoud@capgemini.com"} }),
      headers: {
        'Authorization': `Bearer ${environment.apiToken}`,
        'Content-Type': 'application/json',
      },
    });

    // https://google.github.io/adk-docs/events/
    // https://github.com/GoogleCloudPlatform/agent-starter-pack/blob/main/src/frontends/
    // https://cloud.google.com/vertex-ai/generative-ai/docs/reference/rest/v1/projects.locations.reasoningEngines/streamQuery?apix_params=%7B%22name%22%3A%22projects%2Fhacker2025-team-12-dev%2Flocations%2Fus-central1%2FreasoningEngines%2F5741922399129960448%22%2C%22resource%22%3A%7B%22input%22%3A%7B%22message%22%3A%22hello%22%2C%22user_id%22%3A%22benjamin.francisoud%40capgemini.com%22%7D%7D%7D
    // https://cloud.google.com/vertex-ai/generative-ai/docs/reference/rest/v1/projects.locations.reasoningEngines/query?apix_params=%7B%22name%22%3A%22projects%2Fhacker2025-team-12-dev%2Flocations%2Fus-central1%2FreasoningEngines%2F5741922399129960448%22%2C%22resource%22%3A%7B%22input%22%3A%7B%22classMethod%22%3A%22query%22%2C%22message%22%3A%22hello%22%2C%22user_id%22%3A%22benjamin.francisoud%40capgemini.com%22%7D%7D%7D
    
    // Assume the backend streams NDJSON events, one per line
    const reader = response.body?.getReader();
    let decoder = new TextDecoder();
    let fullResponseText = '';
    let finalText = '';
    let done = false;
    let streamStarted = false;
    let finalEvent: any = {};

    console.log('[GeminiApi] Starting event stream read...');
    while (reader && !done) {
      streamStarted = true;
      const { value, done: streamDone } = await reader.read();
      if (value) {
        const chunk = decoder.decode(value, { stream: true });
        console.log('[GeminiApi] Received chunk:', chunk);
        // Split in case multiple events per chunk
        for (const line of chunk.split('\n')) {
          if (!line.trim()) continue;
          let event;
          try {
            event = JSON.parse(line);
            console.log('[GeminiApi] Parsed event:', event);
            finalEvent = event;
          } catch {
            console.warn('[GeminiApi] Failed to parse event line:', line);
            continue;
          }
          // Accumulate streaming text if present
          if (
            event.partial &&
            event.content &&
            event.content.parts &&
            event.content.parts[0].text
          ) {
            fullResponseText += event.content.parts[0].text;
            console.log('[GeminiApi] Accumulated text:', fullResponseText);
          }
          // Check if it's a final, displayable event
          if (event.is_final_response || (typeof event.is_final_response === 'function' && event.is_final_response())) {
            if (
              event.content &&
              event.content.parts &&
              event.content.parts[0].text
            ) {
              finalText = fullResponseText + (event.content.parts[0].text || '');
              console.log('[GeminiApi] Final response detected:', finalText);
              done = true;
              break;
            }
          }
        }
      }
      if (streamDone) {
        console.log('[GeminiApi] Stream done.');
        break;
      }
    }
    // Fallback: If no streaming occurred, try to parse as a single event
    if (!finalText && !streamStarted && response.headers.get('content-type')?.includes('application/json')) {
      const json = await response.json();
      console.log('[GeminiApi] Fallback to single event JSON:', json);
      finalText = json.content?.parts?.[0]?.text || '';
    }
    console.log('[GeminiApi] Returning final text:', finalText.trim());
    const lastEventText = finalEvent.content?.parts?.[0]?.text || '';
    // return finalText.trim();
    console.log('[GeminiApi] Returning final event:', lastEventText);
    return lastEventText.trim();
  }
}

/**
 * Gemini API Mock
 */
class GeminiApiMock implements IGeminiApi {
  constructor(private _delay: number) {}

  generateChatName(_: string): Promise<string> {
    return this._delayResponse('Lorem Ipsum ' + Math.round(Math.random() * 10));
  }

  generateQueryResponse(_: string): Promise<string> {
    return this._delayResponse(LOREM_IPSUM);
  }

  private _delayResponse(response: string) {
    return new Promise<string>((res) =>
      setTimeout(() => res(response), this._delay),
    );
  }
}

/**
 * Enables Gemini API for the Fetch mock.
 */
export const provideGeminiApi = (config: {
  /**
   * Enable or disable mocked data. If disabled, the API will call the api/gemini.js Express server.
   */
  mockedData: boolean;
  /**
   * Set a response delay, if `mockedData: true`. Default: `2000ms`
   */
  delay?: number;
}): Provider => ({
  provide: GeminiApi,
  useValue: !config.mockedData
    ? new GeminiApi()
    : new GeminiApiMock(
        config.delay !== undefined ? config.delay : DEFAULT_DELAY,
      ),
});
