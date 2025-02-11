import { WebClient, KnownBlock } from '@slack/web-api';

/**
 * Sends a Slack message to the specified channel with the given Block Kit layout.
 * If `threadTs` is provided, the message will be posted as a reply in that thread.
 * Returns the Slack "ts" of the posted message.
 */
export async function sendSlackMessage(
    blocks: KnownBlock[],
    token: string,
    channel: string,
    threadTs?: string
): Promise<string | undefined> {
    const client = new WebClient(token);

    try {
        // Slack requires a fallback "text" field; even though we primarily use blocks.
        const result = await client.chat.postMessage({
            channel,
            blocks,
            text: '', // Provide a fallback text in case blocks can't be rendered
            thread_ts: threadTs,
        });

        // Slack returns `result.ts` which is either the new message's TS
        // or the same thread_ts if replying in an existing thread.
        return result.ts as string;
    } catch (error) {
        console.error('Error posting Slack message:', error);
        return undefined;
    }
}
