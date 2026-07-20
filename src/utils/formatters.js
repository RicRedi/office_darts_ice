export function formatEloChange(change) {
  if (change > 0) return `+${change}`;
  return `${change}`;
}

export function formatDate(timestamp) {
  return new Date(timestamp).toLocaleString('cs-CZ', {
    day: 'numeric',
    month: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatMinutesRemaining(editableUntil) {
  const minutesLeft = Math.max(0, Math.ceil((editableUntil - Date.now()) / 60000));
  if (minutesLeft <= 0) return null;
  return `Lze upravit ještě ${minutesLeft} min`;
}
