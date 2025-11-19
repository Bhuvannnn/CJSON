/**
 * Parser utility functions
 */

import { ArrayNode, ObjectNode } from '../ast/nodes';

/**
 * Checks if all items in an array are objects with the same keys
 * @param arrayNode - The array node to check
 * @returns Boolean indicating if array is uniform
 */
export function checkArrayUniformity(arrayNode: ArrayNode): boolean {
  if (arrayNode.items.length === 0) {
    return true; // Empty array is considered uniform
  }

  if (arrayNode.items.length === 1) {
    return arrayNode.items[0].type === 'object';
  }

  // Check if all items are objects
  const allObjects = arrayNode.items.every((item) => item.type === 'object');
  if (!allObjects) {
    return false;
  }

  // Get keys from first object
  const firstObject = arrayNode.items[0] as ObjectNode;
  const firstKeys = Array.from(firstObject.properties.keys()).sort();

  // Check if all objects have the same keys
  for (let i = 1; i < arrayNode.items.length; i++) {
    const item = arrayNode.items[i] as ObjectNode;
    const itemKeys = Array.from(item.properties.keys()).sort();

    if (itemKeys.length !== firstKeys.length) {
      return false;
    }

    for (let j = 0; j < firstKeys.length; j++) {
      if (itemKeys[j] !== firstKeys[j]) {
        return false;
      }
    }
  }

  return true;
}

