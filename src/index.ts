import * as core from '@actions/core';
import { QaStatus } from './asana';
import env from 'env-var';
import { getPrDescriptionsForProd } from './github';

async function run() {
    try {
        const isProd = core.getInput('is-prod');
        console.log({ isProd });

        await getPrDescriptionsForProd();
    } catch (error: any) {
        core.setFailed(error.message);
    }
}

run();
