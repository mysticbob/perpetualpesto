/**
 * Detected Item Card
 *
 * Card showing a single detected item with editing capabilities
 */

import React, { useState } from 'react';
import {
  Box,
  HStack,
  VStack,
  Text,
  Input,
  Select,
  Checkbox,
  IconButton,
  Badge,
  Alert,
  AlertIcon,
  Collapse
} from '@chakra-ui/react';
import { DeleteIcon, EditIcon, CheckIcon } from '@chakra-ui/icons';
import type { DetectedItem, DuplicateMatch } from '../../types/camera-scanning';

interface DetectedItemCardProps {
  item: DetectedItem;
  index: number;
  duplicateWarning?: DuplicateMatch;
  onEdit: (edited: DetectedItem) => void;
  onRemove: () => void;
  onToggleSelect?: (selected: boolean) => void;
  selected?: boolean;
}

export function DetectedItemCard({
  item,
  index,
  duplicateWarning,
  onEdit,
  onRemove,
  onToggleSelect,
  selected = true
}: DetectedItemCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedItem, setEditedItem] = useState(item);

  const handleSave = () => {
    onEdit(editedItem);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditedItem(item);
    setIsEditing(false);
  };

  const confidenceColor =
    item.confidence >= 0.9 ? 'green' :
    item.confidence >= 0.75 ? 'yellow' : 'red';

  return (
    <Box
      p={3}
      borderWidth={1}
      borderRadius="md"
      borderColor={selected ? 'blue.500' : 'gray.200'}
      bg={selected ? 'blue.50' : 'white'}
      opacity={selected ? 1 : 0.6}
    >
      <VStack align="stretch" spacing={2}>
        <HStack justify="space-between">
          <HStack flex={1}>
            {onToggleSelect && (
              <Checkbox
                isChecked={selected}
                onChange={(e) => onToggleSelect(e.target.checked)}
              />
            )}
            <VStack align="start" spacing={0} flex={1}>
              {isEditing ? (
                <Input
                  value={editedItem.name}
                  onChange={(e) => setEditedItem({ ...editedItem, name: e.target.value })}
                  size="sm"
                />
              ) : (
                <Text fontWeight="bold">{item.name}</Text>
              )}
              {isEditing ? (
                <Select
                  value={editedItem.category}
                  onChange={(e) => setEditedItem({ ...editedItem, category: e.target.value as any })}
                  size="xs"
                  width="150px"
                >
                  <option value="produce">Produce</option>
                  <option value="canned_goods">Canned Goods</option>
                  <option value="condiments">Condiments</option>
                  <option value="spices">Spices</option>
                  <option value="dairy">Dairy</option>
                  <option value="frozen">Frozen</option>
                  <option value="beverages">Beverages</option>
                  <option value="snacks">Snacks</option>
                  <option value="other">Other</option>
                </Select>
              ) : (
                <Text fontSize="xs" color="gray.600">{item.category}</Text>
              )}
            </VStack>
            <Badge colorScheme={confidenceColor}>
              {(item.confidence * 100).toFixed(0)}%
            </Badge>
          </HStack>

          <HStack>
            {isEditing ? (
              <>
                <IconButton
                  aria-label="Save"
                  icon={<CheckIcon />}
                  size="sm"
                  colorScheme="green"
                  onClick={handleSave}
                />
                <IconButton
                  aria-label="Cancel"
                  icon={<DeleteIcon />}
                  size="sm"
                  variant="ghost"
                  onClick={handleCancel}
                />
              </>
            ) : (
              <>
                <IconButton
                  aria-label="Edit"
                  icon={<EditIcon />}
                  size="sm"
                  variant="ghost"
                  onClick={() => setIsEditing(true)}
                />
                <IconButton
                  aria-label="Remove"
                  icon={<DeleteIcon />}
                  size="sm"
                  variant="ghost"
                  colorScheme="red"
                  onClick={onRemove}
                />
              </>
            )}
          </HStack>
        </HStack>

        {/* Quantity */}
        <HStack fontSize="sm" spacing={4}>
          {isEditing ? (
            <HStack>
              <Input
                value={editedItem.quantity.amount}
                onChange={(e) => setEditedItem({
                  ...editedItem,
                  quantity: { ...editedItem.quantity, amount: parseInt(e.target.value) || 1 }
                })}
                size="xs"
                width="60px"
                type="number"
              />
              <Input
                value={editedItem.quantity.unit}
                onChange={(e) => setEditedItem({
                  ...editedItem,
                  quantity: { ...editedItem.quantity, unit: e.target.value }
                })}
                size="xs"
                width="80px"
              />
            </HStack>
          ) : (
            <Text>
              {item.quantity.amount} {item.quantity.unit}
              {item.quantity.size && ` (${item.quantity.size})`}
              {item.quantity.estimatedFillLevel !== 1.0 && (
                <> • {(item.quantity.estimatedFillLevel! * 100).toFixed(0)}% full</>
              )}
            </Text>
          )}
        </HStack>

        {/* Duplicate warning */}
        {duplicateWarning && (
          <Alert status="warning" fontSize="sm" py={2}>
            <AlertIcon boxSize="16px" />
            {duplicateWarning.reason}
          </Alert>
        )}
      </VStack>
    </Box>
  );
}
