import * as core from '@actions/core';
import { QaStatus, updatePrTaskStatuses } from './asana';
import env from 'env-var';

import {
    getPrDescription,
    getPrDescriptionsForProd,
    getPrNumber,
} from './github';
import { handleReleaseNotes } from './release-notes';

async function handleSinglePr(status: QaStatus) {
    try {
        const description = getPrDescription();
        await updatePrTaskStatuses(description, status);
    } catch (err: any) {
        console.log(`PR number ${getPrNumber()} failed. ${err.message}`);
    }
}

async function handleInProd(slackBotToken: string, slackBotChannelId: string) {
    const descriptions = await getPrDescriptionsForProd();
    await Promise.all(
        descriptions.map(async ({ description, prNumber }) => {
            try {
                await updatePrTaskStatuses(description, QaStatus.Prod);
            } catch (err: any) {
                console.log(
                    `PR number ${prNumber} failed. ${err.message}. PR description:\n ${description}`
                );
            }
        })
    );

    await handleReleaseNotes(descriptions, slackBotToken, slackBotChannelId);
}

async function run() {
    try {
        const isReview = core.getInput('is-review') !== 'false';
        const baseBranch = env.get('GITHUB_BASE_REF').required().asString();
        const isPrToStaging = ['master', 'main', 'staging'].includes(
            baseBranch
        );
        const isPrToProd = baseBranch === 'prod';
        const slackToken: string = core.getInput('slack-bot-token');
        const slackBotChannelId: string = core.getInput('slack-bot-channel-id');

        if (isPrToStaging) {
            if (isReview) {
                await handleSinglePr(QaStatus.Review);
            } else {
                await handleSinglePr(QaStatus.Staging);
            }
        } else if (isPrToProd) {
            await handleInProd(slackToken, slackBotChannelId);
        }
    } catch (error: any) {
        core.setFailed(error.message);
    }
}

run();
