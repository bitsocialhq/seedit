/**
 * Returns a short display-safe version of an address.
 * If the address contains a dot (e.g. "my-community.eth"), it is returned as-is.
 * Otherwise the middle bytes (characters 8-20) are returned as the shortened form.
 */
const getShortAddress = (address: string): string => {
  if (!address) return '';
  if (address.includes('.')) return address;
  if (address.length < 20) return '';
  return address.slice(8, 20);
};

export default getShortAddress;
