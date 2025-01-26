import { getFeatureFlagIdsFromPrIfExists, getTaskDetailsFromPr } from './asana';
import { sendSlackMessage } from './slack';
import { getRepo, getPrLink } from './github';

export const handleReleaseNotes = async (
    descriptionAndPrNumberArray: any[],
    slackBotToken: string,
    slackBotChannelId: string,
    isMergeNotes: boolean
): Promise<void> => {
    try {
        const releaseNotes: string = await getReleaseNotesFromDescriptions(
            descriptionAndPrNumberArray,
            isMergeNotes
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

export function getFeatureFlagIdsFromPrIfExists(
    prDescription: string
): string[] {
    const featureFlagRegex = /\[FeatureFlags\]\s*\(([^)]+)\)/gi; // Matches [FeatureFlags](flags)

    const matches = [...prDescription.matchAll(featureFlagRegex)];
    if (!matches.length) {
        console.log('Feature flags not found in PR description');
        return [];
    }

    const featureFlags = new Set<string>();

    matches.forEach(match => {
        if (match[1]) {
            match[1]
                .split(',')
                .map(flag => flag.trim().toLowerCase()) // Normalize case and trim spaces
                .forEach(flag => featureFlags.add(flag)); // Add to Set to avoid duplicates
        }
    });

    return Array.from(featureFlags);
}

const getReleaseNotesFromDescriptions = async (
    descriptionAndPrNumberArray: any[],
    isMergeNotes: boolean
): Promise<string> => {
    let taskDetailsFromAllDescriptions: {
        title: string;
        url: string;
        featureFlagsArr: string[];
    }[] = [];
    console.log('descriptionAndPrNumberArray', descriptionAndPrNumberArray);
    await Promise.all(
        descriptionAndPrNumberArray.map(async ({ description }) => {
            try {
                const { taskUrls, taskTitleAndAssigneeArray } =
                    await getTaskDetailsFromPr(description);
                const featureFlagsArr: string[] =
                    getFeatureFlagIdsFromPrIfExists(description);
                // Map titles and URLs into a structured format
                const taskDetails = taskUrls.map(
                    (url: string, index: number) => ({
                        title: taskTitleAndAssigneeArray[index]?.title,
                        url,
                        featureFlagsArr,
                    })
                );

                taskDetailsFromAllDescriptions = [
                    ...taskDetailsFromAllDescriptions,
                    ...taskDetails,
                ];
            } catch (error) {
                console.error(
                    'Failed to process description:',
                    description,
                    error
                );
            }
        })
    );

    // Format task details for Slack (clickable titles with URLs)
    let formattedTaskDetails = taskDetailsFromAllDescriptions
        .map(
            ({ title, url, featureFlagsArr }) =>
                `<${url}|${title}>${
                    featureFlagsArr?.length
                        ? ` with flags: ${featureFlagsArr.join(', ')}`
                        : ''
                }`
        )
        .join('\n');

    if (taskDetailsFromAllDescriptions.length === 0) {
        formattedTaskDetails =
            'No Asana tickets were found in the provided descriptions.';
    }

    return `New release to ${getRepo()} is being ${
        isMergeNotes ? 'deployed right now 🚀' : 'cooked 👩‍🍳'
    }
    \n ${getPrLink()}
    \n those are the Asana tickets included:\n${formattedTaskDetails}\n<!subteam^S05SL1L1XE2>`;
};
