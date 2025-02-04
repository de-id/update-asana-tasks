import { WebClient, KnownBlock } from '@slack/web-api';

export const sendSlackMessage = async (
    blocks: KnownBlock[],
    slackBotToken: string,
    slackChannelId: string
) => {
    const client = new WebClient(slackBotToken);

    return client.chat.postMessage({
        channel: slackChannelId,
        blocks,
    });
};
