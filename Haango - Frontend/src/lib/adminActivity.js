export function formatLastActive(date, now, isCurrentlyActive = false) {
  if (!date) return 'No activity recorded';
  if (isCurrentlyActive) return 'Active Now';

  const elapsed = Math.max(0, now - new Date(date).getTime());
  if (!Number.isFinite(elapsed)) return 'No activity recorded';
  const minutes = Math.floor(elapsed / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function inferPageDurations(pages, sessionEndedAt) {
  return pages.map((page, index) => {
    const recordedTimeSpent = Math.max(0, Number(page.timeSpent) || 0);
    if (recordedTimeSpent > 0) return { ...page, timeSpent: recordedTimeSpent };

    const pageStartedAt = new Date(page.timestamp || 0).getTime();
    const nextPageStartedAt = pages[index + 1]?.timestamp
      ? new Date(pages[index + 1].timestamp).getTime()
      : new Date(sessionEndedAt || 0).getTime();
    const inferredTimeSpent = Number.isFinite(pageStartedAt)
      && Number.isFinite(nextPageStartedAt)
      && nextPageStartedAt > pageStartedAt
      ? Math.floor((nextPageStartedAt - pageStartedAt) / 1000)
      : 0;

    return { ...page, timeSpent: inferredTimeSpent };
  });
}
