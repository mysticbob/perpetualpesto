/**
 * Scan Results Review Component
 *
 * Allows users to review and edit scanned items before adding to pantry
 */

import React, { useState } from 'react';
import {
  Box,
  VStack,
  HStack,
  Button,
  Text,
  Badge,
  Divider,
  useToast
} from '@chakra-ui/react';
import { DetectedItemCard } from './DetectedItemCard';
import type { ScanResult, DetectedItem, DuplicateMatch } from '../../types/camera-scanning';

interface ScanResultsReviewProps {
  scanResult: ScanResult;
  duplicates?: DuplicateMatch[];
  onConfirm: (items: DetectedItem[]) => void;
  onCancel: () => void;
  onRescan?: () => void;
}

export function ScanResultsReview({
  scanResult,
  duplicates = [],
  onConfirm,
  onCancel,
  onRescan
}: ScanResultsReviewProps) {
  const toast = useToast();
  const [items, setItems] = useState<DetectedItem[]>(
    scanResult.detectedItems as DetectedItem[]
  );
  const [selectedItems, setSelectedItems] = useState<Set<number>>(
    new Set(items.map((_, i) => i))
  );

  const handleItemEdit = (index: number, edited: DetectedItem) => {
    const newItems = [...items];
    newItems[index] = edited;
    setItems(newItems);
  };

  const handleItemRemove = (index: number) => {
    const newSelected = new Set(selectedItems);
    newSelected.delete(index);
    setSelectedItems(newSelected);
  };

  const handleToggleSelect = (index: number, selected: boolean) => {
    const newSelected = new Set(selectedItems);
    if (selected) {
      newSelected.add(index);
    } else {
      newSelected.delete(index);
    }
    setSelectedItems(newSelected);
  };

  const handleConfirm = () => {
    const confirmedItems = items.filter((_, i) => selectedItems.has(i));
    if (confirmedItems.length === 0) {
      toast({
        title: 'No items selected',
        description: 'Please select at least one item to add',
        status: 'warning',
        duration: 3000
      });
      return;
    }
    onConfirm(confirmedItems);
  };

  const getDuplicateForItem = (index: number): DuplicateMatch | undefined => {
    const item = items[index];
    return duplicates.find(d => d.scannedItem.name === item.name);
  };

  const avgConfidence = items.length > 0
    ? items.reduce((sum, item) => sum + item.confidence, 0) / items.length
    : 0;

  return (
    <Box>
      <VStack spacing={4} align="stretch">
        {/* Header */}
        <Box>
          <HStack justify="space-between" mb={2}>
            <Text fontSize="xl" fontWeight="bold">
              Review Scanned Items
            </Text>
            <Badge colorScheme={avgConfidence > 0.8 ? 'green' : 'yellow'} fontSize="md">
              {(avgConfidence * 100).toFixed(0)}% avg confidence
            </Badge>
          </HStack>

          <Text fontSize="sm" color="gray.600">
            {items.length} items detected • {selectedItems.size} selected
            • {scanResult.processingTimeMs}ms • ${scanResult.cost?.toFixed(4)}
          </Text>
        </Box>

        <Divider />

        {/* Items list */}
        <VStack spacing={3} align="stretch" maxH="500px" overflowY="auto">
          {items.map((item, index) => (
            <DetectedItemCard
              key={index}
              item={item}
              index={index}
              duplicateWarning={getDuplicateForItem(index)}
              onEdit={(edited) => handleItemEdit(index, edited)}
              onRemove={() => handleItemRemove(index)}
              onToggleSelect={(selected) => handleToggleSelect(index, selected)}
              selected={selectedItems.has(index)}
            />
          ))}
        </VStack>

        <Divider />

        {/* Actions */}
        <HStack spacing={3}>
          {onRescan && (
            <Button onClick={onRescan} variant="outline">
              Rescan
            </Button>
          )}
          <Button onClick={onCancel} variant="ghost">
            Cancel
          </Button>
          <Button
            colorScheme="green"
            onClick={handleConfirm}
            flex={1}
            isDisabled={selectedItems.size === 0}
          >
            Add {selectedItems.size} item{selectedItems.size !== 1 ? 's' : ''} to Pantry
          </Button>
        </HStack>
      </VStack>
    </Box>
  );
}
