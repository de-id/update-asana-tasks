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

export async function updatePrTaskStatus(
    prDescription: string,
    status: QaStatus
) {
    const taskGid = extractTaskGid(prDescription);
    await updateQaStatus(taskGid, status);
}

function extractTaskGid(prDescription: string) {
    const asanaUrlRegex = /https:\/\/app\.asana\.com\/0\/.*/;
    const taskUrl = prDescription.match(asanaUrlRegex)?.[0];

    if (!taskUrl) {
        throw new Error('Asana task URL not found in PR description');
    }

    const [_, __, taskGid] = [...taskUrl.matchAll(/\d+/g)].map(
        match => match[0]
    );

    return taskGid;
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
