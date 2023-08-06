import * as core from '@actions/core';
import { QaStatus, updatePrTaskStatus } from './asana';
import env from 'env-var';

import { getPrDescription, getPrDescriptionsForProd } from './github';

async function handleInReview() {
    const description = getPrDescription();
    await updatePrTaskStatus(description, QaStatus.Review);
}

async function handleInStaging() {
    const description = getPrDescription();
    await updatePrTaskStatus(description, QaStatus.Staging);
}

async function handleInProd() {
    const descriptions = await getPrDescriptionsForProd();
    await Promise.all(
        descriptions.map(description => {
            updatePrTaskStatus(description, QaStatus.Prod);
        })
    );
}

async function run() {
    try {
        const isReview = core.getInput('is-review') !== 'false';
        const baseBranch = env.get('GITHUB_BASE_REF').required().asString();
        const isPrToStaging = ['master', 'main', 'staging'].includes(
            baseBranch
        );
        const isPrToProd = baseBranch === 'prod';

        if (isPrToStaging) {
            if (isReview) {
                await handleInReview();
            } else {
                await handleInStaging();
            }
        } else if (isPrToProd) {
            await handleInProd();
        }
    } catch (error: any) {
        core.setFailed(error.message);
    }
}

run();
