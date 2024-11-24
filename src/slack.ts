import { WebClient } from '@slack/web-api';

export const sendSlackMessage = async (
    text: string,
    slackBotToken: string,
    slackChannelId: string
) => {
    const client = new WebClient(slackBotToken);

    return client.chat.postMessage({
        channel: slackChannelId,
        text,
    });
};
