export const emailAddressPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function extractEmailAddress(value: string) {
  const trimmedValue = value.trim();
  const bracketedAddress = trimmedValue.match(/<([^<>]+)>/)?.[1];

  return (bracketedAddress ?? trimmedValue).trim().toLowerCase();
}

export function isValidEmailAddress(value: string) {
  return emailAddressPattern.test(extractEmailAddress(value));
}

export function uniqueEmailAddresses(values: string[]) {
  const seen = new Set<string>();

  return values.reduce<string[]>((addresses, value) => {
    const address = extractEmailAddress(value);

    if (!address || seen.has(address)) {
      return addresses;
    }

    seen.add(address);
    addresses.push(address);
    return addresses;
  }, []);
}
