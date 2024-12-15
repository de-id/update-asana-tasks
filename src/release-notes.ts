import { getTaskIdsAndUrlsFromPr } from './asana';
import { sendSlackMessage } from './slack';

export const handleReleaseNotes = async (
    descriptionAndPrNumberArray: any[],
    slackBotToken: string,
    slackBotChannelId: string
): Promise<void> => {
    try {
        const releaseNotes: string = getReleaseNotesFromDescriptions(
            descriptionAndPrNumberArray
        );
        if (slackBotToken && slackBotChannelId) {
            await sendSlackMessage(
                releaseNotes,
                slackBotToken,
                slackBotChannelId
            );
        }
    } catch (e) {
        console.log('Failed to send release notes on pr to prod');
    }
};

const getReleaseNotesFromDescriptions = (
    descriptionAndPrNumberArray: any[]
): string => {
    let taskUrlsFromAllDescriptions: string[] = [];
    descriptionAndPrNumberArray.map(async ({ description }) => {
        try {
            const { taskUrls: taskUrlsFromCurrentDescription } =
                getTaskIdsAndUrlsFromPr(description);
            console.log(
                'taskUrlsFromCurrentDescription',
                taskUrlsFromCurrentDescription,
                getTaskIdsAndUrlsFromPr(description)
            );
            taskUrlsFromAllDescriptions = [
                ...taskUrlsFromAllDescriptions,
                ...taskUrlsFromCurrentDescription,
            ];
        } catch (e) {}
    });
    console.log(
        'taskUrlsFromAllDescriptions',
        taskUrlsFromAllDescriptions,
        descriptionAndPrNumberArray
    );
    return `New release is being cooked 👩‍🍳, those are the asana tickets: 
    ${taskUrlsFromAllDescriptions.join(', ')}`;
};
