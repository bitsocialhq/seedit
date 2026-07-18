export const getEditableAccountData = (account: Record<string, unknown> | undefined): Record<string, unknown> => {
  const editableAccount = { ...account };

  delete editableAccount.pkc;
  delete editableAccount.pkcReactOptions;
  delete editableAccount.karma;
  delete editableAccount.unreadNotificationCount;

  const author = editableAccount.author;
  if (author && typeof author === 'object' && !Array.isArray(author)) {
    const editableAuthor = { ...(author as Record<string, unknown>) };
    delete editableAuthor.avatar;
    editableAccount.author = editableAuthor;
  }

  return editableAccount;
};
