const VALUE_DELIMITER_REGEXP = /[ ,;|()\t\v\f\r\n{}]+/g;

export function tokenizeValue(value: string): string[] {
  return value
    .split(VALUE_DELIMITER_REGEXP)
    .map((token) => token.trim())
    .filter((token) => token.length > 0);
}
