import { KnownBlock } from '@slack/web-api';
import { getTaskDetailsFromPr } from './asana';
import { sendSlackMessage } from './slack';
import { repo, getPrLink, targetBranch } from './github';
import {
    findDataInHiddenComments,
    storeDataInHiddenComment,
    getPrNumber,
} from './github';

export const handleReleaseNotes = async (
    descriptionAndPrNumberArray: any[],
    slackBotToken: string,
    slackBotChannelId: string,
    isMergeNotes: boolean
): Promise<void> => {
    try {
        console.log(
            '[handleReleaseNotes] Step 1: Building Slack blocks from PR descriptions...'
        );
        const blocks: KnownBlock[] = await getReleaseNotesFromDescriptions(
            descriptionAndPrNumberArray,
            isMergeNotes
        );
        console.log(
            '[handleReleaseNotes] Step 1: Blocks built successfully:',
            JSON.stringify(blocks)
        );

        console.log(
            '[handleReleaseNotes] Step 2: Checking Slack token/channel...'
        );
        if (!slackBotToken || !slackBotChannelId) {
            console.log(
                '[handleReleaseNotes] Slack token or channel not provided. Exiting...'
            );
            return;
        }

        console.log(
            '[handleReleaseNotes] Step 3: Retrieving PR number from context...'
        );
        const prNumber = getPrNumber();
        if (!prNumber) {
            console.log(
                '[handleReleaseNotes] No PR number found in context. Exiting...'
            );
            return;
        }
        console.log(`[handleReleaseNotes] PR number is ${prNumber}`);

        console.log(
            '[handleReleaseNotes] Step 4: Checking for existing Slack thread ID in hidden PR comment...'
        );
        const existingThreadTs = await findDataInHiddenComments(
            prNumber,
            'slack-thread-id'
        );
        console.log(
            `[handleReleaseNotes] Existing thread_ts is: ${
                existingThreadTs || 'None'
            }`
        );

        console.log(
            '[handleReleaseNotes] Step 5: Sending Slack message (blocks) to channel...'
        );
        const newThreadTs = await sendSlackMessage(
            blocks,
            slackBotToken,
            slackBotChannelId,
            existingThreadTs
        );
        console.log(
            `[handleReleaseNotes] Slack message sent. Returned thread_ts: ${
                newThreadTs || 'None'
            }`
        );

        console.log(
            '[handleReleaseNotes] Step 6: If no existing thread, store the newly created thread ID...'
        );
        if (!existingThreadTs && newThreadTs) {
            console.log(
                `[handleReleaseNotes] Storing new Slack thread_ts: ${newThreadTs}`
            );
            await storeDataInHiddenComment(
                prNumber,
                'slack-thread-id',
                newThreadTs
            );
        } else {
            console.log(
                '[handleReleaseNotes] No need to store thread ID. Either one already existed or Slack did not return one.'
            );
        }
    } catch (e) {
        console.log(
            '[handleReleaseNotes] Failed to send release notes on PR to prod'
        );
        console.error(e);
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

// Reuse your original buildSlackBlocks function (unchanged):
const buildSlackBlocks = (
    repoName: string,
    prLink: string,
    env: string,
    taskDetails: string,
    isMergeNotes: boolean
): KnownBlock[] => {
    return [
        {
            type: 'section',
            text: {
                type: 'mrkdwn',
                text: `A new release is being *${
                    isMergeNotes ? 'deployed 🚀' : 'cooked 👩‍🍳'
                }*`,
            },
        },
        {
            type: 'section',
            fields: [
                {
                    type: 'mrkdwn',
                    text: `*Repository:* ${repoName}`,
                },
                {
                    type: 'mrkdwn',
                    text: `*PR:* ${prLink}`,
                },
                {
                    type: 'mrkdwn',
                    text: `*Env:* ${env}`,
                },
            ],
        },
        {
            type: 'section',
            text: {
                type: 'mrkdwn',
                text: taskDetails
                    ? `Asana tickets included:\n${taskDetails}`
                    : 'no asana tickets :tada:',
            },
        },
        {
            type: 'divider',
        },
        {
            type: 'context',
            elements: [
                {
                    type: 'mrkdwn',
                    text: 'notify <!subteam^S05SL1L1XE2>',
                },
            ],
        },
    ];
};

/**
 * Gathers Asana tasks from all child PR descriptions, then assembles them
 * into Slack blocks (clickable links, etc.).
 */
const getReleaseNotesFromDescriptions = async (
    descriptionAndPrNumberArray: any[],
    isMergeNotes: boolean
): Promise<KnownBlock[]> => {
    let taskDetailsFromAllDescriptions: {
        title: string;
        url: string;
        featureFlagsArr: string[];
    }[] = [];

    console.log('descriptionAndPrNumberArray', descriptionAndPrNumberArray);

    // Process each PR's description
    await Promise.all(
        descriptionAndPrNumberArray.map(async ({ description }) => {
            try {
                const { taskUrls, taskTitleAndAssigneeArray } =
                    await getTaskDetailsFromPr(description);
                const featureFlagsArr =
                    getFeatureFlagIdsFromPrIfExists(description);

                const taskDetails = taskUrls.map(
                    (url: string, index: number) => ({
                        title: taskTitleAndAssigneeArray[index]?.title,
                        url,
                        featureFlagsArr,
                    })
                );

                taskDetailsFromAllDescriptions.push(...taskDetails);
            } catch (error) {
                console.error(
                    'Failed to process description:',
                    description,
                    error
                );
            }
        })
    );

    // Format tasks with Slack-friendly bullets & clickable titles
    let formattedTaskDetails = taskDetailsFromAllDescriptions
        .map(
            ({ title, url, featureFlagsArr }) =>
                `• <${url}|${title}>${
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
    const prLink = getPrLink();
    return buildSlackBlocks(
        repo,
        prLink,
        targetBranch,
        formattedTaskDetails,
        isMergeNotes
    );
};
