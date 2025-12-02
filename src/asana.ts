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

type TaskTitleAndAssignee = {
    assignee: string;
    title: string;
};

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
    // Support both Asana URL formats:
    // Format 1: https://app.asana.com/0/XXXXX/YYYYY (where YYYYY is the task ID)
    // Format 2: https://app.asana.com/1/XXXXX/project/YYYYY/task/ZZZZZ (where ZZZZZ is the task ID)
    const asanaUrlRegex =
        /https:\/\/app\.asana\.com\/(?:0\/\d+\/\d+|1\/\d+\/project\/\d+\/task\/\d+)/g;

    const taskUrls = [...prDescription.matchAll(asanaUrlRegex)].map(
        match => match[0]
    );

    if (!taskUrls.length) {
        console.log('Asana task URL not found in PR description');
        return { taskIds: [], taskUrls: [] };
    }

    const taskIds = taskUrls.map(taskUrl => {
        // Try format 2 first: /task/ZZZZZ
        const taskFormat2Match = taskUrl.match(/\/task\/(\d+)/);
        if (taskFormat2Match) {
            return taskFormat2Match[1];
        }
        // Fallback to format 1: /0/XXXXX/YYYYY (extract YYYYY)
        const taskGidMatch = taskUrl.match(/\/(\d+)$/);
        return taskGidMatch ? taskGidMatch[1] : 'not-found';
    });

    return { taskIds, taskUrls };
}

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

export async function getTaskDetailsFromPr(prDescription: string): Promise<{
    taskIds: string[];
    taskUrls: string[];
    taskTitleAndAssigneeArray: TaskTitleAndAssignee[];
}> {
    // Extract task IDs and URLs using the existing function
    const { taskIds, taskUrls } = getTaskIdsAndUrlsFromPr(prDescription);

    if (!taskIds.length) {
        console.log(
            'No valid Asana task IDs found in PR description',
            prDescription
        );
        return { taskIds: [], taskUrls: [], taskTitleAndAssigneeArray: [] };
    }

    // Fetch task titles for each task ID
    const asanaPat = core.getInput('asana-pat');
    const taskTitleAndAssigneeArray: TaskTitleAndAssignee[] = await Promise.all(
        taskIds.map(async taskGid => {
            try {
                const apiUrl = `${asanaBaseUrl}${taskGid}`;
                console.log(
                    `Fetching task details for ID ${taskGid} from ${apiUrl}`
                );
                const response = await axios.get(apiUrl, {
                    headers: {
                        Authorization: `Bearer ${asanaPat}`,
                    },
                });
                console.log(
                    `Response for task ${taskGid}:`,
                    JSON.stringify(response.data, null, 2)
                );
                const title = response.data?.data?.name;
                const assignee = response.data?.data?.assignee;
                if (!title) {
                    console.warn(
                        `Task ${taskGid} response structure:`,
                        JSON.stringify(response.data, null, 2)
                    );
                }
                return {
                    title: title || 'Unknown Task Title',
                    assignee: assignee || 'Unassigned',
                };
            } catch (error: any) {
                console.error(
                    `Failed to fetch title for task ID ${taskGid}:`,
                    error?.message,
                    error?.response?.status,
                    error?.response?.data
                );
                return {
                    title: 'Unknown Task Title',
                    assignee: 'Unassigned',
                };
            }
        })
    );

    return { taskIds, taskUrls, taskTitleAndAssigneeArray };
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
