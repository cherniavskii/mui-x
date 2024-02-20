import * as React from 'react';
import Box from '@mui/material/Box';

import { RichTreeView } from '@mui/x-tree-view/RichTreeView';

const MUI_X_PRODUCTS = [
  {
    id: 'grid',
    label: 'Data Grid',
    children: [
      { id: 'grid-community', label: '@mui/x-data-grid' },
      { id: 'grid-pro', label: '@mui/x-data-grid-pro' },
      { id: 'grid-premium', label: '@mui/x-data-grid-premium' },
    ],
  },
  {
    id: 'pickers',
    label: 'Date and Time Pickers',
    children: [
      { id: 'pickers-community', label: '@mui/x-date-pickers' },
      { id: 'pickers-pro', label: '@mui/x-date-pickers-pro' },
    ],
  },
  {
    id: 'charts',
    label: 'Charts',
    children: [{ id: 'charts-community', label: '@mui/x-charts' }],
  },
  {
    id: 'tree-view',
    label: 'Tree View',
    children: [
      { id: 'tree-view-community', label: '@mui/x-tree-view' },
      { id: 'tree-view-pro', label: '@mui/x-tree-view-pro', disabled: true },
    ],
  },
  {
    id: 'scheduler',
    label: 'Scheduler',
    disabled: true,
    children: [{ id: 'scheduler-community', label: '@mui/x-scheduler' }],
  },
];

const isItemDisabled = (item) => !!item.disabled;

export default function DisabledPropItem() {
  return (
    <Box sx={{ minHeight: 200, flexGrow: 1, maxWidth: 400 }}>
      <RichTreeView items={MUI_X_PRODUCTS} isItemDisabled={isItemDisabled} />
    </Box>
  );
}