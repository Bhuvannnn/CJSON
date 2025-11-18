export interface FormatterContext {
  indentLevel: number;
  indentSize: number;
  newline: string;
}

export interface FormattedValue {
  inline: boolean;
  text: string;
  headerSuffix?: string;
}

export interface FormattedProperty {
  key: string;
  value: FormattedValue;
  headerSuffix?: string;
}

export function indentString(context: FormatterContext): string {
  const width = Math.max(0, context.indentLevel * context.indentSize);
  return width === 0 ? '' : ' '.repeat(width);
}

export function formatObject(
  properties: FormattedProperty[],
  context: FormatterContext,
): FormattedValue {
  if (properties.length === 0) {
    return { inline: true, text: '{}' };
  }

  const indent = indentString(context);
  const newline = context.newline;
  const lines: string[] = [];

  for (const property of properties) {
    const key = property.headerSuffix ? `${property.key}${property.headerSuffix}` : property.key;
    if (property.value.inline) {
      lines.push(`${indent}${key}: ${property.value.text}`);
    } else {
      lines.push(`${indent}${key}:`);
      lines.push(property.value.text);
    }
  }

  return { inline: false, text: lines.join(newline) };
}

export function formatArray(items: FormattedValue[], context: FormatterContext): FormattedValue {
  const indent = indentString(context);
  const newline = context.newline;
  const lines: string[] = [];

  for (const item of items) {
    if (item.inline) {
      lines.push(`${indent}- ${item.text}`);
    } else {
      lines.push(`${indent}-`);
      lines.push(item.text);
    }
  }

  return { inline: false, text: lines.join(newline) };
}

