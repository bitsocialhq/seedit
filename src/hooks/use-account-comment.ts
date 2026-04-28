import { useAccountComment, type UseAccountCommentResult } from '@bitsocial/bitsocial-react-hooks';
import { getAccountCommentIndex, MISSING_ACCOUNT_COMMENT_INDEX } from '../lib/utils/account-comment-utils';

const useOptionalAccountComment = (commentIndex: number | string | null | undefined): UseAccountCommentResult => {
  return useAccountComment({ commentIndex: getAccountCommentIndex(commentIndex) ?? MISSING_ACCOUNT_COMMENT_INDEX });
};

export default useOptionalAccountComment;
