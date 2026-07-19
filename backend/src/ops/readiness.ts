let acceptingTraffic = true;

export function markNotReady(): void {
  acceptingTraffic = false;
}

export function markReady(): void {
  acceptingTraffic = true;
}

export function isAcceptingTraffic(): boolean {
  return acceptingTraffic;
}
