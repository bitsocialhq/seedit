import askseeditDirectory from './seedit-directories/seedit-askseedit-directory.json';
import awwDirectory from './seedit-directories/seedit-aww-directory.json';
import directoryDefaults from './seedit-directories/seedit-directories-defaults.json';
import funnyDirectory from './seedit-directories/seedit-funny-directory.json';
import gamingDirectory from './seedit-directories/seedit-gaming-directory.json';
import interestingasfuckDirectory from './seedit-directories/seedit-interestingasfuck-directory.json';
import memesDirectory from './seedit-directories/seedit-memes-directory.json';
import newsDirectory from './seedit-directories/seedit-news-directory.json';
import picsDirectory from './seedit-directories/seedit-pics-directory.json';
import todayilearnedDirectory from './seedit-directories/seedit-todayilearned-directory.json';
import videosDirectory from './seedit-directories/seedit-videos-directory.json';
import { isDirectoryCode, type SeeditDirectoryCode } from '../lib/utils/directory-codes';
import { normalizeDirectoryDefaultsData, normalizeDirectoryList, type DirectoryList } from '../lib/utils/directory-list-utils';

const rawDirectoryLists = {
  askseedit: askseeditDirectory,
  memes: memesDirectory,
  news: newsDirectory,
  pics: picsDirectory,
  todayilearned: todayilearnedDirectory,
  interestingasfuck: interestingasfuckDirectory,
  gaming: gamingDirectory,
  videos: videosDirectory,
  funny: funnyDirectory,
  aww: awwDirectory,
} satisfies Record<SeeditDirectoryCode, unknown>;

export const vendoredDirectoryDefaults = normalizeDirectoryDefaultsData(directoryDefaults);

export const vendoredDirectoryLists = Object.fromEntries(
  Object.entries(rawDirectoryLists).map(([directoryCode, rawList]) => {
    const list = normalizeDirectoryList(rawList, directoryCode, vendoredDirectoryDefaults);
    if (!list) throw new Error(`Invalid vendored Seedit directory list: ${directoryCode}`);
    return [directoryCode, list];
  }),
) as Record<SeeditDirectoryCode, DirectoryList>;

export const getVendoredDirectoryList = (directoryCode: string | undefined): DirectoryList | null =>
  directoryCode && isDirectoryCode(directoryCode) ? vendoredDirectoryLists[directoryCode] : null;
