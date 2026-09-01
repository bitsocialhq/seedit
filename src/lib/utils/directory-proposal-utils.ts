import type { SeeditDirectoryCode } from './directory-codes';

const LISTS_REPOSITORY_URL = 'https://github.com/bitsocialnet/lists';
const SEEDIT_DIRECTORIES_URL = `${LISTS_REPOSITORY_URL}/tree/master/seedit-directories`;
const COMMUNITY_REQUIREMENTS_URL = `${LISTS_REPOSITORY_URL}#requirements-to-have-your-community-included`;

const createProposalIssueUrl = (title: string, body: string): string => {
  const url = new URL(`${LISTS_REPOSITORY_URL}/issues/new`);
  url.searchParams.set('title', title);
  url.searchParams.set('body', body);
  return url.toString();
};

export const getNewDirectoryProposalUrl = (): string =>
  createProposalIssueUrl(
    'Propose a new Seedit directory: s/<directory>',
    `## Proposed directory
s/<directory>

## Topic
Describe what this short route should cover.

## Why it belongs in Seedit
Explain why this directory would be useful and distinct from the existing directories.

## Suggested communities
List any existing community addresses that could compete for this route.

Directory definitions: ${SEEDIT_DIRECTORIES_URL}`,
  );

export const getDirectoryCommunityProposalUrl = (directoryCode: SeeditDirectoryCode): string => {
  const directoryFileUrl = `${LISTS_REPOSITORY_URL}/blob/master/seedit-directories/seedit-${directoryCode}-directory.json`;

  return createProposalIssueUrl(
    `Propose a community for s/${directoryCode}: <community-address>`,
    `## Directory
s/${directoryCode}

Directory file: ${directoryFileUrl}

## Community
Address: <community-address>

## Why this community belongs
Explain how it matches this directory's topic and meets the uptime and content requirements.

Community requirements: ${COMMUNITY_REQUIREMENTS_URL}`,
  );
};
