export const MISSING_ACCOUNT_COMMENT_INDEX = -1;

export const getAccountCommentIndex = (value: number | string | null | undefined): number | undefined => {
  if (typeof value === 'number') {
    return Number.isInteger(value) && value >= 0 ? value : undefined;
  }

  if (typeof value !== 'string' || !/^\d+$/.test(value)) {
    return undefined;
  }

  const index = Number(value);
  return Number.isInteger(index) && index >= 0 ? index : undefined;
};
