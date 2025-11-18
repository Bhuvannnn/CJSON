export interface FormatterContext {
  indentLevel: number;
  indentSize: number;
  newline: string;
}

export interface FormattedValue {
  inline: boolean;
  text: string;
  headerSuffix?: string;
  leadingComment?: string;
  inlineComment?: string;
  trailingComment?: string;
}

export interface FormattedProperty {
  key: string;
  value: FormattedValue;
  headerSuffix?: string;
  leadingComment?: string;
  inlineComment?: string;
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
    // Add leading comment if present
    if (property.leadingComment || property.value.leadingComment) {
      const comment = property.leadingComment || property.value.leadingComment;
      if (comment) {
        const commentLines = comment.split('\n');
        for (const commentLine of commentLines) {
          lines.push(`${indent}#${commentLine}`);
        }
      }
    }
    
    const key = property.headerSuffix ? `${property.key}${property.headerSuffix}` : property.key;
    if (property.value.inline) {
      let line = `${indent}${key}: ${property.value.text}`;
      // Add inline comment if present
      if (property.inlineComment || property.value.inlineComment) {
        const comment = property.inlineComment || property.value.inlineComment;
        if (comment) {
          line += ` #${comment}`;
        }
      }
      lines.push(line);
    } else {
      lines.push(`${indent}${key}:`);
      lines.push(property.value.text);
    }
    
    // Add trailing comment if present
    if (property.value.trailingComment) {
      const commentLines = property.value.trailingComment.split('\n');
      for (const commentLine of commentLines) {
        lines.push(`${indent}#${commentLine}`);
      }
    }
  }

  return { inline: false, text: lines.join(newline) };
}

export function formatArray(items: FormattedValue[], context: FormatterContext): FormattedValue {
  const indent = indentString(context);
  const newline = context.newline;
  const lines: string[] = [];

  for (const item of items) {
    // Add leading comment if present
    if (item.leadingComment) {
      const commentLines = item.leadingComment.split('\n');
      for (const commentLine of commentLines) {
        lines.push(`${indent}#${commentLine}`);
      }
    }
    
    if (item.inline) {
      let line = `${indent}- ${item.text}`;
      // Add inline comment if present
      if (item.inlineComment) {
        line += ` #${item.inlineComment}`;
      }
      lines.push(line);
    } else {
      lines.push(`${indent}-`);
      lines.push(item.text);
    }
    
    // Add trailing comment if present
    if (item.trailingComment) {
      const commentLines = item.trailingComment.split('\n');
      for (const commentLine of commentLines) {
        lines.push(`${indent}#${commentLine}`);
      }
    }
  }

  return { inline: false, text: lines.join(newline) };
}

