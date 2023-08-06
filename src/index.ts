import * as core from '@actions/core';
import { QaStatus } from './asana';
import env from 'env-var';
import { getPrDescriptionsForProd } from './github';

const baseBranch = env.get('GITHUB_BASE_REF').asString();

async function run() {
    try {
        let prDescriptions: string[] = [];
        let statusToUpdate: QaStatus;

        if (baseBranch === 'prod') {
            await getPrDescriptionsForProd();
        }
    } catch (error: any) {
        core.setFailed(error.message);
    }
}

run();
