import * as core from '@actions/core';
import * as github from '@actions/github';

// Tags must be in format v6.6.6-pr.66 for feature branch or v6.6.6 for release

async function run() {
    try {
        const latestTag = core.getInput('latest-tag');
        const isFeatureBranch = ![false, 'false'].includes(core.getInput('is-feature-branch'));

        console.log({ latestTag, isFeatureBranch });

        const [major, minor, patch] = latestTag
            .split('-')[0]
            .slice(1)
            .split('.')
            .map(number => parseInt(number));

        if (isFeatureBranch) {
            const newVersionString = `v${major}.${minor}.${patch + 1}`;
            const prNumber = github.context.payload.pull_request?.number;
            core.setOutput('version', `${newVersionString}-pr.${prNumber}`);
        } else {
            const newVersionString = `v${major}.${minor + 1}.${patch}`;
            core.setOutput('version', newVersionString);
            core.setOutput('tags-to-update-wildcard', `v${major}.${minor}*`);
        }
    } catch (error: any) {
        core.setFailed(error.message);
    }
}

run();
