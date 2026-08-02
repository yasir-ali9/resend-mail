export function formatEmailDate(value: string) {
  const date = new Date(value);
  const today = new Date();

  if (date.toDateString() === today.toDateString()) {
    return new Intl.DateTimeFormat(undefined, {
      hour: "numeric",
      minute: "2-digit",
    }).format(date);
  }

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
  }).format(date);
}

export function senderName(value: string) {
  const name = value.split("<")[0]?.trim();

  return stripAddressQuotes(name || value);
}

export function formatAddress(value: string) {
  const trimmedValue = value.trim();
  const bracketedAddress = trimmedValue.match(/<([^<>]+)>/)?.[1];
  const name = stripAddressQuotes(trimmedValue.split("<")[0]?.trim() ?? "");

  return bracketedAddress && name
    ? `${name} <${bracketedAddress.trim()}>`
    : stripAddressQuotes(trimmedValue);
}

function stripAddressQuotes(value: string) {
  const trimmedValue = value.trim();

  return trimmedValue.length >= 2 &&
    trimmedValue.startsWith('"') &&
    trimmedValue.endsWith('"')
    ? trimmedValue.slice(1, -1).trim()
    : trimmedValue;
}
