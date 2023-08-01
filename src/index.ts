import * as core from '@actions/core';
import { getPrDescriptions } from './github';
import { QaStatus, updatePrTaskStatus } from './asana';

async function run() {
    try {
        const toStatus = core.getInput('to-status');
        const prDescription = core.getInput('pr-description');
        const tagNameList = core.getInput('tag-name-list');

        let prDescriptions: string[] = [];
        let isOnlyTask = false;
        // @ts-ignore-next-line
        const statusToUpdate = QaStatus[toStatus];

        if (!statusToUpdate) {
            throw new Error(`Invalid status! Only available are: ${Object.keys(QaStatus).join(', ')}`);
        }

        if (prDescription) {
            isOnlyTask = true;
            prDescriptions = [prDescription];
        } else if (tagNameList) {
            prDescriptions = await getPrDescriptions(tagNameList);
        }

        console.log(prDescriptions);
        console.log(statusToUpdate);

        const updatePromises = prDescriptions.map(description =>
            updatePrTaskStatus(description, statusToUpdate, isOnlyTask)
        );

        await Promise.all(updatePromises);
    } catch (error: any) {
        core.setFailed(error.message);
    }
}

run();
