import { GRID_ROOT_GROUP_ID, GridGroupNode, GridRowId, GridRowTreeConfig } from '@mui/x-data-grid';
import {
  GridRowTreeCreationValue,
  GridTreeDepths,
  isDeepEqual,
  getTreeNodeDescendants,
  GridRowTreeUpdatedGroups,
} from '@mui/x-data-grid/internals';
import { GridTreePathDuplicateHandler, RowTreeBuilderNode } from './models';
import { insertDataRowInTree } from './insertDataRowInTree';
import { removeDataRowFromTree } from './removeDataRowFromTree';
import { addActionToGroup, getNodePathInTree } from './utils';

export interface UpdateRowTreeNodes {
  inserted: RowTreeBuilderNode[];
  modified: RowTreeBuilderNode[];
  removed: GridRowId[];
}

interface UpdateRowTreeParams {
  previousTree: GridRowTreeConfig;
  previousTreeDepth: GridTreeDepths;
  nodes: UpdateRowTreeNodes;
  defaultGroupingExpansionDepth: number;
  isGroupExpandedByDefault?: (node: GridGroupNode) => boolean;
  groupingName: string;
  onDuplicatePath?: GridTreePathDuplicateHandler;
}

export const updateRowTree = (params: UpdateRowTreeParams): GridRowTreeCreationValue => {
  const tree = { ...params.previousTree };
  const treeDepths = { ...params.previousTreeDepth };

  const updatedGroups: GridRowTreeUpdatedGroups = {};

  for (let i = 0; i < params.nodes.inserted.length; i += 1) {
    const { id, path } = params.nodes.inserted[i];

    insertDataRowInTree({
      tree,
      treeDepths,
      updatedGroups,
      id,
      path,
      onDuplicatePath: params.onDuplicatePath,
      isGroupExpandedByDefault: params.isGroupExpandedByDefault,
      defaultGroupingExpansionDepth: params.defaultGroupingExpansionDepth,
    });
  }

  for (let i = 0; i < params.nodes.removed.length; i += 1) {
    const nodeId = params.nodes.removed[i];

    removeDataRowFromTree({
      tree,
      treeDepths,
      updatedGroups,
      id: nodeId,
    });
  }

  for (let i = 0; i < params.nodes.modified.length; i += 1) {
    const { id, path } = params.nodes.modified[i];
    const pathInPreviousTree = getNodePathInTree({ tree, id });
    const isInSameGroup = isDeepEqual(pathInPreviousTree, path);

    if (!isInSameGroup) {
      removeDataRowFromTree({
        tree,
        treeDepths,
        updatedGroups,
        id,
      });

      insertDataRowInTree({
        tree,
        treeDepths,
        updatedGroups,
        id,
        path,
        onDuplicatePath: params.onDuplicatePath,
        isGroupExpandedByDefault: params.isGroupExpandedByDefault,
        defaultGroupingExpansionDepth: params.defaultGroupingExpansionDepth,
      });
    } else {
      addActionToGroup(updatedGroups, tree[id].parent!, 'modifyChildren');
    }
  }

  // TODO rows v6: Avoid walking the whole tree, we should be able to generate the new list only using slices.
  const dataRowIds = getTreeNodeDescendants(tree, GRID_ROOT_GROUP_ID, true);

  return {
    tree,
    treeDepths,
    groupingName: params.groupingName,
    dataRowIds,
    updatedGroups,
  };
};
