import * as React from 'react';
import {
  DataGridPremium,
  renderEditInputCell,
  useGridApiRef,
  getGridNumericOperators,
} from '@mui/x-data-grid-premium';
import Box from '@mui/material/Box';
import { randomInt, randomCompanyName } from '@mui/x-data-grid-generator';

export const generateRows = (count) => {
  const rows = [];
  for (let i = 0; i < count; i += 1) {
    const quantity = randomInt(1, 10);
    const price = randomInt(10, 100);
    const discount = randomInt(0, 20);
    const tax1 = randomInt(1, 5);
    const tax2 = randomInt(0, 3);

    rows.push({
      id: i,
      product: randomCompanyName(),
      quantity,
      price,
      discount,
      tax1,
      tax2,
      subtotal: `[quantity] * [price]`,
      total: `([quantity] * [price]) * (1 - [discount]/100) * (1 + SUM([tax1], [tax2]) / 100)`,
    });
  }
  return rows;
};

const initialRows = generateRows(10);

const formulaColumn = {
  type: 'string',
  editable: true,
  valueGetter: (value, row) => {
    // use valueGetter for evaluation, not valueFormatter, so that sorting and filtering use the calculated values, not formulas
    if (row && typeof value === 'string') {
      return evaluateFormula(value, row);
    }
    return '';
  },
  renderEditCell: (params) => {
    const row = params.api.getRow(params.id);
    const formulaValue = row[params.field];
    const newParams = {
      ...params,
      // By default, the value from valueGetter is used for editing.
      // But we actually want to edit the formula itself
      value: formulaValue,
    };
    return renderEditInputCell(newParams);
  },
  filterOperators: getGridNumericOperators(),
};

const columns = [
  { field: 'product', headerName: 'Product', width: 150, editable: true },
  {
    field: 'quantity',
    headerName: 'Qty.',
    type: 'number',
    width: 60,
    editable: true,
  },
  {
    field: 'price',
    headerName: 'Price, $',
    type: 'number',
    width: 70,
    editable: true,
  },
  {
    field: 'subtotal',
    headerName: 'Subtotal, $',
    width: 90,
    ...formulaColumn,
  },
  {
    field: 'discount',
    headerName: 'Discount, %',
    type: 'number',
    width: 100,
    editable: true,
  },
  {
    field: 'tax1',
    headerName: 'Tax 1, %',
    type: 'number',
    width: 70,
    editable: true,
  },
  {
    field: 'tax2',
    headerName: 'Tax 2, %',
    type: 'number',
    width: 70,
    editable: true,
  },
  {
    field: 'total',
    headerName: 'Total, $',
    flex: 1,
    minWidth: 200,
    ...formulaColumn,
  },
];

export default function FormulaEditing() {
  const apiRef = useGridApiRef();

  const onCellModesModelChange = React.useCallback(
    (model) => {
      // eslint-disable-next-line guard-for-in
      for (const rowId in model) {
        const cells = model[rowId];
        for (const field in cells) {
          /**
           * When the formula field switches to edit mode, call setEditCellValue to override the initial value in the editing state, because by default it uses the value returned by valueGetter (the calculated value, not the formula itself).
           * */
          // TODO: Find a better way to detect formula columns
          if (
            (field === 'total' || field === 'subtotal') &&
            cells[field].mode === 'edit'
          ) {
            const row = apiRef.current?.getRow(rowId);
            apiRef.current?.setEditCellValue({
              id: rowId,
              field,
              value: row[field],
              debounceMs: 200,
            });
          }
        }
      }
    },
    [apiRef],
  );

  return (
    <Box sx={{ width: '100%' }}>
      <DataGridPremium
        apiRef={apiRef}
        rows={initialRows}
        columns={columns}
        showCellVerticalBorder
        showColumnVerticalBorder
        rowHeight={32}
        columnHeaderHeight={48}
        onCellModesModelChange={onCellModesModelChange}
        cellSelection
        disableRowSelectionOnClick
      />
    </Box>
  );
}

const FUNCTIONS = [
  {
    name: 'SUM',
    transform: (input) => {
      return input.replace(/SUM\(([^)]*)\)/g, (match, argsString) => {
        const args = argsString
          .split(',')
          .map((arg) => parseFloat(arg.trim()))
          .filter((num) => !Number.isNaN(num));
        return args.reduce((sum, current) => sum + current, 0).toString();
      });
    },
  },
  {
    name: 'COUNT',
    transform: (input) => {
      return input.replace(/COUNT\(([^)]*)\)/g, (match, argsString) => {
        const args = argsString
          .split(',')
          .map((arg) => parseFloat(arg.trim()))
          .filter((num) => !Number.isNaN(num));
        return args.length.toString();
      });
    },
  },
];

/**
 * Evaluates an Excel-like formula string against a given row object.
 * Supports field references (e.g., [fieldName]), basic arithmetic, and SUM/COUNT functions.
 * @param formula The formula string to evaluate.
 * @param row The row object containing the field values.
 * @returns The calculated result or an error string.
 */
function evaluateFormula(formula, row) {
  if (!formula || typeof formula !== 'string') {
    return formula;
  }

  // Step 1: Replace field references [fieldName] with their values
  // Only numerical values are substituted to avoid issues with math operations.
  let evaluatedExpression = formula.replace(/\[(\w+)\]/g, (match, fieldName) => {
    const value = row[fieldName];
    return typeof value === 'number' ? value.toString() : '0';
  });

  FUNCTIONS.forEach((func) => {
    evaluatedExpression = func.transform(evaluatedExpression);
  });

  // Step 3: Evaluate the resulting arithmetic expression
  // Sanitize the expression to allow only numbers, basic operators, and parentheses
  // This is a basic safety measure against arbitrary code execution with new Function().
  const sanitizedExpression = evaluatedExpression.replace(/[^0-9+\-*/(). ]/g, '');

  try {
    // eslint-disable-next-line no-new-func
    const result = new Function(`return ${sanitizedExpression}`)();
    // Ensure the result is a finite number, otherwise return 'Error'
    return Number.isFinite(result) ? result : 'Error';
  } catch (error) {
    console.error('Formula evaluation error:', error);
    return 'Error';
  }
}
