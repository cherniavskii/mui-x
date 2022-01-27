import type {
  GridRowTreeNodeConfig,
  GridRowId,
  GridRowTreeConfig,
} from '../../../../../_modules_/grid/models/gridRows';
import { GridKeyValue } from '../../../../../_modules_/grid/models/colDef/gridColDef';
import type {
  GridRowGroupingResult,
  GridRowGroupParams,
} from '../../../../../_modules_/grid/hooks/core/rowGroupsPerProcessing';

type GridGroupingCriteriaToIdTree = {
  [field: string]: {
    [key: string]: { id: GridRowId; children: GridGroupingCriteriaToIdTree };
  };
};

export interface BuildRowTreeGroupingCriteria {
  field: string | null;
  key: GridKeyValue;
}

interface BuildRowTreeParams extends GridRowGroupParams {
  rows: { id: GridRowId; path: BuildRowTreeGroupingCriteria[] }[];
  defaultGroupingExpansionDepth: number;
  isGroupExpandedByDefault?: (node: GridRowTreeNodeConfig) => boolean;
  groupingName: string;
}

interface TempRowTreeNode extends Omit<GridRowTreeNodeConfig, 'children' | 'childrenExpanded'> {
  children?: Record<GridRowId, GridRowId>;
}

/**
 * Transform a list of rows into a tree structure where each row references its parent and children.
 * If a row have a parent which does not exist in the input rows, creates an auto generated row
 *
 ```
 params = {
   ids: [0, 1, 2],
   idRowsLookup: { 0: {...}, 1: {...}, 2: {...} },
   rows: [
     { id: 0, path: ['A'] },
     { id: 1, path: ['B', 'A'] },
     { id: 2, path: ['B', 'A', 'A'] }
   ],
   defaultGroupingExpansionDepth: 0,
 }
 Returns:
 {
   ids: [0, 1, 2, 'auto-generated-row-B'],
   idRowsLookup: { 0: {...}, 1: {...}, 2: {...}, 'auto-generated-row-B': {} },
   tree: {
     '0': { id: 0, parent: null, childrenExpanded: false, depth: 0, groupingKey: 'A' },
     'auto-generated-row-B': { id: 'auto-generated-row-B', parent: null, childrenExpanded: false, depth: 0, groupingKey: 'B' },
     '1': { id: 1, parent: 'auto-generated-row-B', childrenExpanded: false, depth: 1, groupingKey: 'A' },
     '2': { id: 2, parent: 1, childrenExpanded: false, depth: 2, groupingKey: 'A' },
   },
   treeDepth: 3,
 }
 ```
 */
export const buildRowTree = (params: BuildRowTreeParams): GridRowGroupingResult => {
  // During the build, we store the children as a Record to avoid linear complexity when checking if a children is already defined.
  const tempTree: Record<GridRowId, TempRowTreeNode> = {};
  let treeDepth = 1;

  const ids = [...params.ids];
  const idRowsLookup = { ...params.idRowsLookup };

  const groupingCriteriaToIdTree: GridGroupingCriteriaToIdTree = {};

  const isGroupExpandedByDefault = (node: GridRowTreeNodeConfig) => {
    const previousExpansion = params.previousTree?.[node.id]?.childrenExpanded;
    if (previousExpansion != null) {
      return previousExpansion;
    }

    if (!node.children || !node.children.length) {
      return undefined;
    }

    if (params.isGroupExpandedByDefault) {
      return params.isGroupExpandedByDefault(node);
    }

    return (
      params.defaultGroupingExpansionDepth === -1 ||
      params.defaultGroupingExpansionDepth > node.depth
    );
  };

  for (let i = 0; i < params.rows.length; i += 1) {
    const row = params.rows[i];
    let keyToIdSubTree = groupingCriteriaToIdTree;
    let parentNode: TempRowTreeNode | null = null;

    for (let depth = 0; depth < row.path.length; depth += 1) {
      const { key, field: rawField } = row.path[depth];
      const field = rawField ?? '__no_field__';

      let nodeId: GridRowId;

      let fieldSubTree = keyToIdSubTree[field];
      if (!fieldSubTree) {
        fieldSubTree = {};
        keyToIdSubTree[field] = fieldSubTree;
      }

      let keyConfig = fieldSubTree[key.toString()];
      if (!keyConfig) {
        nodeId =
          depth === row.path.length - 1
            ? row.id
            : `auto-generated-row-${row.path
                .map((groupingCriteria) => `${groupingCriteria.field}/${groupingCriteria.key}`)
                .slice(0, depth + 1)
                .join('-')}`;

        keyConfig = { id: nodeId, children: {} };
        fieldSubTree[key.toString()] = keyConfig;
      } else {
        nodeId = keyConfig.id;
      }
      keyToIdSubTree = keyConfig.children;

      if (!tempTree[nodeId]) {
        const isAutoGenerated = depth < row.path.length - 1;

        const node: TempRowTreeNode = {
          id: nodeId,
          isAutoGenerated,
          parent: parentNode?.id ?? null,
          groupingKey: key,
          groupingField: rawField,
          depth,
        };

        if (isAutoGenerated) {
          idRowsLookup[nodeId] = {};
          ids.push(nodeId);
        }

        tempTree[nodeId] = node;
      }

      if (parentNode != null) {
        if (!parentNode.children) {
          parentNode.children = {};
        }

        parentNode.children[nodeId] = nodeId;
      }

      parentNode = tempTree[nodeId]!;
    }

    treeDepth = Math.max(treeDepth, row.path.length);
  }

  const tree: GridRowTreeConfig = {};
  for (let i = 0; i < ids.length; i += 1) {
    const rowId = ids[i];
    const tempNode = tempTree[rowId];
    const node: GridRowTreeNodeConfig = {
      ...tempNode,
      children: tempNode.children ? Object.values(tempNode.children) : undefined,
    };
    const childrenExpanded = isGroupExpandedByDefault(node);

    tree[rowId] = { ...node, childrenExpanded };
  }

  return {
    tree,
    treeDepth,
    ids,
    idRowsLookup,
    groupingName: params.groupingName,
  };
};
