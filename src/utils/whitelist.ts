export const WHITELISTED_ADDRESSES = [
  // Add whitelisted wallet addresses here
  'XdrWCnyFd5RjDnFjrxnR9HSGhG6Vw54rY2FanLubtWZ',
];

export const isWhitelisted = (address: string): boolean => {
  return WHITELISTED_ADDRESSES.includes(address);
};