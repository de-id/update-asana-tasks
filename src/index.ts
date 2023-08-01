import * as core from '@actions/core';
import * as github from '@actions/github';
import { getPrDescriptions } from './github';

async function run() {
    try {
        const statusToUpdate = core.getInput('to-status');
        const prDescription = core.getInput('pr-description');
        const tagNameList = core.getInput('tag-name-list');

        console.log(tagNameList);
        console.log(github.context.repo);

        getPrDescriptions([github.context.payload.pull_request?.number || 27]);
    } catch (error: any) {
        core.setFailed(error.message);
    }
}

run();
