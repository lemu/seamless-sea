/**
 * Convert ISO 3166-1 alpha-2 country code to flag emoji
 * @param countryCode - Two-letter ISO country code (e.g., "US", "BR", "CN")
 * @returns Flag emoji string
 */
export function getCountryFlagEmoji(countryCode: string): string {
  if (!countryCode || countryCode.length !== 2) {
    return "";
  }

  // Convert country code to regional indicator symbols
  // A = U+1F1E6, B = U+1F1E7, etc.
  const codePoints = countryCode
    .toUpperCase()
    .split("")
    .map((char) => 0x1f1e6 + char.charCodeAt(0) - 65);

  return String.fromCodePoint(...codePoints);
}

/**
 * Get formatted port display with flag emoji
 * @param portName - Name of the port
 * @param countryCode - Two-letter ISO country code
 * @returns Formatted string with flag emoji (e.g., "Santos 🇧🇷")
 */
export function getPortWithFlag(portName: string, countryCode: string): string {
  const flag = getCountryFlagEmoji(countryCode);
  return flag ? `${portName} ${flag}` : portName;
}

/**
 * Get formatted route display with flag emojis
 * @param loadPort - Load port object with name and countryCode
 * @param dischargePort - Discharge port object with name and countryCode
 * @returns Formatted route string (e.g., "Santos 🇧🇷 → Shanghai 🇨🇳")
 */
export function getRouteDisplay(
  loadPort: { name: string; countryCode: string },
  dischargePort: { name: string; countryCode: string }
): string {
  const loadPortWithFlag = getPortWithFlag(loadPort.name, loadPort.countryCode);
  const dischargePortWithFlag = getPortWithFlag(
    dischargePort.name,
    dischargePort.countryCode
  );
  return `${loadPortWithFlag} → ${dischargePortWithFlag}`;
}
