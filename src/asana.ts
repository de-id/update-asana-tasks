import axios from 'axios';
import * as core from '@actions/core';

const asanaBaseUrl = 'https://app.asana.com/api/1.0/tasks/';

enum CustomFields {
    QaStatus = '1149901879873102',
}

export enum QaStatus {
    Review = '1153933847862684',
    Staging = '1149901879873105',
    Prod = '1149901879873107',
}

const asanaPat = core.getInput('asana-pat');

export async function updatePrTaskStatuses(
    prDescription: string,
    status: QaStatus
) {
    const { taskIds } = getTaskIdsAndUrlsFromPr(prDescription);
    await Promise.all(taskIds.map(taskGid => updateQaStatus(taskGid, status)));
}

export function getTaskIdsAndUrlsFromPr(prDescription: string): {
    taskIds: string[];
    taskUrls: string[];
} {
    // Updated regex to match valid Asana URLs and exclude unwanted characters
    const asanaUrlRegex =
        /https:\/\/app\.asana\.com\/0\/\d+\/\d+(?:\/f)?(?!\))/g;

    // Extract and clean up task URLs
    const taskUrls = [...prDescription.matchAll(asanaUrlRegex)].map(
        match => match[0]
    );

    if (!taskUrls.length) {
        console.log('Asana task URL not found in PR description');
        return { taskIds: [], taskUrls: [] };
    }

    // Extract task IDs from the valid URLs
    const taskIds = taskUrls.map(taskUrl => {
        // Match the last numeric segment in the URL, which corresponds to the task GID
        const taskGidMatch = taskUrl.match(/\/(\d+)(?:\/f)?$/);
        if (!taskGidMatch || !taskGidMatch[1]) {
            console.log(`Could not extract task GID from URL: ${taskUrl}`);
            return 'not-found';
        }
        return taskGidMatch[1];
    });

    return { taskIds, taskUrls };
}

function updateQaStatus(taskGid: string, status: QaStatus) {
    return axios.put(
        asanaBaseUrl + taskGid,
        {
            data: {
                custom_fields: {
                    [CustomFields.QaStatus]: status,
                },
            },
        },
        {
            headers: {
                Authorization: `Bearer ${asanaPat}`,
            },
        }
    );
}
