import React, { useCallback, useEffect, useState, useRef, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  Panel,
  addEdge,
  useNodesState,
  useEdgesState,
  getBezierPath,
  useReactFlow,
  applyNodeChanges,
  applyEdgeChanges,
  ReactFlowProvider
} from 'reactflow';
import 'reactflow/dist/style.css'; // Import the ReactFlow styles
import useNodeStore from '../../store/useNodeStore';
import KnowledgeNode from './KnowledgeNode';
import NodeTable from '../NodeEditor/NodeTable';

// Layout algorithms for positioning nodes
const layoutAlgorithms = {
  circle: (nodes, centerX = 0, centerY = 0) => {
    const regularNodes = nodes.filter(node => !node.data.isBibleRef);
    const bibleNodes = nodes.filter(node => node.data.isBibleRef);
    
    // Position Bible nodes in a row at the very top
    const bibleUpdatedNodes = bibleNodes.map((node, index) => {
      const totalWidth = bibleNodes.length * 120;
      const startX = centerX - totalWidth / 2;
      const x = startX + index * 120;
      const y = -400; // Position at the top of the canvas
      
      return {
        ...node,
        position: { x, y },
        style: { 
          ...node.style,
          background: '#e9f5fe',
          borderColor: '#0ea5e9',
        }
      };
    });
    
    // Position regular nodes in a circle below the Bible nodes
    const regularUpdatedNodes = regularNodes.map((node, index) => {
      const angle = (index / Math.max(1, regularNodes.length)) * 2 * Math.PI;
      const radius = 250;
      const x = centerX + radius * Math.cos(angle);
      const y = centerY + radius * Math.sin(angle) + 100; // Push down a bit
      
      return {
        ...node,
        position: { x, y },
        style: { ...node.style }
      };
    });
    
    return [...regularUpdatedNodes, ...bibleUpdatedNodes];
  },
  
  force: (nodes, edges, iterations = 80) => {
    // Simple force-directed layout
    const nodeMap = {};
    const updatedNodes = [...nodes];
    const bibleNodes = nodes.filter(node => node.data.isBibleRef);
    const regularNodes = nodes.filter(node => !node.data.isBibleRef);
    
    // Initialize node positions with tighter clustering
    updatedNodes.forEach(node => {
      if (!node.position) {
        node.position = { 
          x: Math.random() * 300 - 150, 
          y: Math.random() * 300 - 150 
        };
      }
      nodeMap[node.id] = node;
    });
    
    // Function to detect edge crossings
    const detectCrossings = (edges, nodeMap) => {
      let crossings = 0;
      
      // Check each pair of edges
      for (let i = 0; i < edges.length; i++) {
        for (let j = i + 1; j < edges.length; j++) {
          const edge1 = edges[i];
          const edge2 = edges[j];
          
          // Skip if edges share a node (they can't cross)
          if (edge1.source === edge2.source || 
              edge1.source === edge2.target || 
              edge1.target === edge2.source || 
              edge1.target === edge2.target) {
            continue;
          }
          
          const source1 = nodeMap[edge1.source];
          const target1 = nodeMap[edge1.target];
          const source2 = nodeMap[edge2.source];
          const target2 = nodeMap[edge2.target];
          
          // Skip if any node doesn't exist
          if (!source1 || !target1 || !source2 || !target2) {
            continue;
          }
          
          // Line segments defined by their endpoints
          const x1 = source1.position.x;
          const y1 = source1.position.y;
          const x2 = target1.position.x;
          const y2 = target1.position.y;
          const x3 = source2.position.x;
          const y3 = source2.position.y;
          const x4 = target2.position.x;
          const y4 = target2.position.y;
          
          // Check if the two line segments intersect
          // Using line-line intersection formula
          const denominator = (y4 - y3) * (x2 - x1) - (x4 - x3) * (y2 - y1);
          
          // If lines are parallel, they don't intersect
          if (denominator === 0) {
            continue;
          }
          
          const ua = ((x4 - x3) * (y1 - y3) - (y4 - y3) * (x1 - x3)) / denominator;
          const ub = ((x2 - x1) * (y1 - y3) - (y2 - y1) * (x1 - x3)) / denominator;
          
          // If intersection point is within both line segments
          if (ua >= 0 && ua <= 1 && ub >= 0 && ub <= 1) {
            crossings++;
          }
        }
      }
      
      return crossings;
    };
    
    // Track the best layout with minimum crossings
    let bestCrossings = Infinity;
    let bestPositions = {}; 
    
    // Perform iterations of force-directed algorithm for regular nodes only
    for (let i = 0; i < iterations; i++) {
      // Calculate damping factor that decreases with iterations
      const dampingFactor = 1 - (i / iterations) * 0.5;
      
      // Repulsive forces between regular nodes
      for (let j = 0; j < regularNodes.length; j++) {
        for (let k = j + 1; k < regularNodes.length; k++) {
          const node1 = regularNodes[j];
          const node2 = regularNodes[k];
          
          const dx = node2.position.x - node1.position.x;
          const dy = node2.position.y - node1.position.y;
          const distance = Math.sqrt(dx * dx + dy * dy) || 1;
          
          // Weaker repulsion for a more compact layout
          const repulsionStrength = 3000 / Math.max(distance, 100) * dampingFactor;
          const repulsionFactor = 0.6;
          
          const fx = (dx / distance) * repulsionStrength * repulsionFactor;
          const fy = (dy / distance) * repulsionStrength * repulsionFactor;
          
          node2.position.x += fx;
          node2.position.y += fy;
          node1.position.x -= fx;
          node1.position.y -= fy;
        }
      }
      
      // Attractive forces along edges for regular nodes
      edges.forEach(edge => {
        const source = nodeMap[edge.source];
        const target = nodeMap[edge.target];
        
        // Skip if either node is a Bible node
        if (!source || !target || source.data.isBibleRef || target.data.isBibleRef) {
          return;
        }
        
        const dx = target.position.x - source.position.x;
        const dy = target.position.y - source.position.y;
        const distance = Math.sqrt(dx * dx + dy * dy) || 1;
        
        // Stronger attraction to pull connected nodes closer
        // Use higher attraction to reduce edge crossings
        const attractionStrength = Math.min(0.2 * distance, 40);
        
        const fx = (dx / distance) * attractionStrength;
        const fy = (dy / distance) * attractionStrength;
        
        source.position.x += fx * dampingFactor;
        source.position.y += fy * dampingFactor;
        target.position.x -= fx * dampingFactor;
        target.position.y -= fy * dampingFactor;
      });
      
      // Move all regular nodes down to ensure space for Bible nodes at top
      if (i === 0) {
        regularNodes.forEach(node => {
          node.position.y += 200;
        });
      }
      
      // Every 10 iterations, check for crossings and save best layout
      if (i > 0 && i % 10 === 0) {
        const currentCrossings = detectCrossings(edges, nodeMap);
        
        // If this layout has fewer crossings, save it
        if (currentCrossings < bestCrossings) {
          bestCrossings = currentCrossings;
          bestPositions = {};
          regularNodes.forEach(node => {
            bestPositions[node.id] = { ...node.position };
          });
        }
      }

      // On the final iteration, apply edge crossing penalties
      if (i === iterations - 1 && Object.keys(bestPositions).length > 0) {
        // Use the layout with minimum crossings
        regularNodes.forEach(node => {
          if (bestPositions[node.id]) {
            node.position = bestPositions[node.id];
          }
        });
      }
    }
    
    // Position Bible nodes in a row at the top
    if (bibleNodes.length > 0) {
      const totalWidth = bibleNodes.length * 150;
      const center = regularNodes.reduce((sum, node) => sum + node.position.x, 0) / Math.max(1, regularNodes.length);
      const startX = center - totalWidth / 2;
      
      bibleNodes.forEach((node, index) => {
        node.position = {
          x: startX + index * 150,
          y: -300 // Fixed position at the top
        };
      });
    }
    
    // Final pass - constrain any outliers to reasonable bounds
    const maxDistance = 500;
    regularNodes.forEach(node => {
      const distance = Math.sqrt(node.position.x * node.position.x + node.position.y * node.position.y);
      if (distance > maxDistance) {
        const scale = maxDistance / distance;
        node.position.x *= scale;
        node.position.y *= scale;
        // Ensure we don't push up into Bible node territory
        node.position.y = Math.max(node.position.y, 0);
      }
    });
    
    // Add styling for Bible nodes
    return updatedNodes.map(node => ({
      ...node,
      style: node.data.isBibleRef ? {
        ...node.style,
        background: '#e9f5fe',
        borderColor: '#0ea5e9',
      } : node.style
    }));
  },
  
  hierarchical: (nodes, edges) => {
    const rootNodes = [];
    const nodeMap = {};
    const levels = {};
    const bibleRefs = [];
    const nonBibleNodes = [];
    
    // First pass: separate Bible nodes and non-Bible nodes
    nodes.forEach(node => {
      if (node.data.isBibleRef) {
        bibleRefs.push(node.id);
        levels[node.id] = -1; // Bible nodes at level -1 (above everything)
        rootNodes.push(node.id);
      } else {
        nonBibleNodes.push(node.id);
      }
      
      nodeMap[node.id] = { ...node, children: [], parents: [] };
    });
    
    // No Bible nodes? Set first non-Bible node as root
    if (bibleRefs.length === 0 && nonBibleNodes.length > 0) {
      const firstNodeId = nonBibleNodes[0];
      levels[firstNodeId] = 0;
      rootNodes.push(firstNodeId);
    }
    
    // Build the hierarchy based on edges, tracking both parent and child relationships
    edges.forEach(edge => {
      if (nodeMap[edge.source] && nodeMap[edge.target]) {
        nodeMap[edge.source].children.push(edge.target);
        nodeMap[edge.target].parents.push(edge.source);
      }
    });
    
    // Second pass: ensure non-Bible nodes without incoming edges 
    // connect to level 0 (below Bible nodes)
    nonBibleNodes.forEach(nodeId => {
      const hasIncoming = edges.some(edge => edge.target === nodeId);
      
      // If no incoming edges and level not set yet
      if (!hasIncoming && levels[nodeId] === undefined) {
        // Start at level 0 (below Bible nodes at -1)
        levels[nodeId] = 0;
        
        // Not a direct child of any node, but we place it at level 0
        if (!rootNodes.includes(nodeId)) {
          rootNodes.push(nodeId);
        }
      }
    });
    
    // Assign levels to all remaining nodes through BFS
    const queue = [...rootNodes];
    while (queue.length > 0) {
      const nodeId = queue.shift();
      const node = nodeMap[nodeId];
      const currentLevel = levels[nodeId];
      
      node.children.forEach(childId => {
        // Skip if child is a Bible node (they stay at level -1)
        if (nodeMap[childId].data.isBibleRef) return;
        
        // Ensure child level is at least one below parent
        const minLevel = currentLevel + 1;
        
        if (levels[childId] === undefined || levels[childId] < minLevel) {
          levels[childId] = minLevel;
          queue.push(childId);
        }
      });
    }
    
    // Position nodes based on their levels
    const levelCounts = {};
    const updatedNodes = [];
    
    // Calculate how many nodes per level
    Object.keys(levels).forEach(nodeId => {
      const level = levels[nodeId];
      levelCounts[level] = (levelCounts[level] || 0) + 1;
    });
    
    // Create a nodes-by-level mapping to aid in edge crossing reduction
    const nodesByLevel = {};
    Object.keys(levels).forEach(nodeId => {
      const level = levels[nodeId];
      if (!nodesByLevel[level]) {
        nodesByLevel[level] = [];
      }
      nodesByLevel[level].push(nodeId);
    });
    
    // Order nodes within each level to reduce edge crossings
    // This is a simplified barycenter algorithm
    Object.keys(nodesByLevel).forEach(level => {
      // Skip the Bible nodes at level -1 - they're handled separately
      if (parseInt(level) === -1) return;
      
      const nodesAtLevel = nodesByLevel[level];
      
      // For each node at this level, calculate average position of its parents
      const nodePositions = nodesAtLevel.map(nodeId => {
        const node = nodeMap[nodeId];
        let avgPosition = nodesAtLevel.length / 2; // default middle position
        
        // If node has parents, get their average position in the previous level
        if (node.parents.length > 0) {
          let sum = 0;
          let count = 0;
          
          node.parents.forEach(parentId => {
            // Find parent's position in its level
            if (levels[parentId] !== undefined) {
              const parentLevel = nodesByLevel[levels[parentId]];
              if (parentLevel) {
                const parentPos = parentLevel.indexOf(parentId);
                if (parentPos !== -1) {
                  sum += parentPos;
                  count++;
                }
              }
            }
          });
          
          // Calculate average if there are positioned parents
          if (count > 0) {
            avgPosition = sum / count;
          }
        }
        
        return { id: nodeId, position: avgPosition };
      });
      
      // Sort nodes by average parent position
      nodePositions.sort((a, b) => a.position - b.position);
      
      // Re-assign the ordered nodes to this level
      nodesByLevel[level] = nodePositions.map(n => n.id);
    });
    
    // Track position within each level
    const levelPositions = {};
    
    // Function to get x-coordinate based on level position
    const getXPosition = (level, position, totalInLevel) => {
      // Bible nodes get special treatment - wider spacing
      const xSpacing = 250;
      
      // X position depends on position in level and total nodes in level
      return position * xSpacing - ((totalInLevel - 1) * xSpacing / 2);
    };
    
    // Position each node based on its level and optimized position
    Object.keys(nodesByLevel).forEach(level => {
      const nodesAtThisLevel = nodesByLevel[level];
      const totalInLevel = nodesAtThisLevel.length;
      
      nodesAtThisLevel.forEach((nodeId, position) => {
        const node = nodeMap[nodeId];
        const ySpacing = 150;
        
        // Y position is determined by level (level -1 at top for Bible nodes)
        const y = parseInt(level) * ySpacing;
        
        // X position is optimized to reduce crossings
        const x = getXPosition(level, position, totalInLevel);
        
        // Style Bible nodes differently
        updatedNodes.push({
          ...node,
          position: { x, y },
          style: node.data.isBibleRef ? {
            ...node.style,
            background: '#e9f5fe',
            borderColor: '#0ea5e9',
          } : node.style
        });
      });
    });
    
    return updatedNodes;
  }
};

const GraphView = () => {
  const { t } = useTranslation();
  const storeNodes = useNodeStore(state => state.nodes);
  const storeEdges = useNodeStore(state => state.edges);
  const updateNodePosition = useNodeStore(state => state.updateNodePosition);
  const updateAllNodePositions = useNodeStore(state => state.updateAllNodePositions);
  const linkNodes = useNodeStore(state => state.linkNodes);
  const [showTable, setShowTable] = useState(false);
  const [selectedLayout, setSelectedLayout] = useState('force');
  const reactFlowInstance = useReactFlow();
  const isApplyingLayoutRef = useRef(false);
  const firstRenderRef = useRef(true);
  const layoutCalculatedRef = useRef(false);
  const [isLayoutChanging, setIsLayoutChanging] = useState(false);
  
  useEffect(() => {
    console.log('GraphView mounted, storeNodes:', storeNodes.length);
    console.log('GraphView mounted, storeEdges:', storeEdges.length);
    if (storeEdges.length > 0) {
      console.log('Edge types:', storeEdges.map(edge => edge.type));
    }
  }, [storeNodes, storeEdges]);
  
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [viewportBoundary, setViewportBoundary] = useState([[-2000, -2000], [2000, 2000]]);
  
  // Let's add a custom delete confirmation dialog component to the GraphView component
  // First add state for the confirmation dialog
  const [deleteConfirmation, setDeleteConfirmation] = useState({
    isOpen: false,
    nodeId: null,
    nodeTitle: ''
  });

  // Add the deleteNode function that will pass deletion events up to useNodeStore
  const deleteNode = useNodeStore(state => state.removeNode);

  // Add a function to handle node deletion that will be passed to KnowledgeNode
  const handleNodeDelete = useCallback((nodeId, nodeTitle) => {
    setDeleteConfirmation({
      isOpen: true,
      nodeId,
      nodeTitle
    });
  }, []);
  
  // Create a memoized KnowledgeNode component first
  const MemoizedKnowledgeNode = useMemo(() => 
    function NodeComponent(props) {
      return <KnowledgeNode {...props} onDelete={handleNodeDelete} />;
    },
  [handleNodeDelete]);
  
  // Define nodeTypes here with the memoized component
  const nodeTypes = useMemo(() => ({
    knowledgeNode: MemoizedKnowledgeNode
  }), [MemoizedKnowledgeNode]);
  
  // Calculate viewport boundaries based on node positions
  const calculateBoundaries = useCallback(() => {
    if (nodes.length === 0) return;
    
    // Find the extremes of node positions
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    
    nodes.forEach(node => {
      minX = Math.min(minX, node.position.x);
      minY = Math.min(minY, node.position.y);
      maxX = Math.max(maxX, node.position.x);
      maxY = Math.max(maxY, node.position.y);
    });
    
    // Add padding around the nodes (300 units in each direction - tighter than before)
    const padding = 300;
    const newBoundary = [
      [minX - padding, minY - padding],
      [maxX + padding, maxY + padding]
    ];
    
    // Ensure minimum viewport size even with few nodes
    const minViewportSize = 1000;
    const width = newBoundary[1][0] - newBoundary[0][0];
    const height = newBoundary[1][1] - newBoundary[0][1];
    
    if (width < minViewportSize) {
      const center = (newBoundary[0][0] + newBoundary[1][0]) / 2;
      newBoundary[0][0] = center - minViewportSize / 2;
      newBoundary[1][0] = center + minViewportSize / 2;
    }
    
    if (height < minViewportSize) {
      const center = (newBoundary[0][1] + newBoundary[1][1]) / 2;
      newBoundary[0][1] = center - minViewportSize / 2;
      newBoundary[1][1] = center + minViewportSize / 2;
    }
    
    console.log('Setting new viewport boundary:', newBoundary);
    setViewportBoundary(newBoundary);
  }, [nodes]);
  
  // Update boundaries whenever node positions change significantly
  useEffect(() => {
    if (nodes.length > 0 && !isApplyingLayoutRef.current) {
      calculateBoundaries();
    }
  }, [nodes, calculateBoundaries]);
  
  // Modify the applyLayout function to avoid the infinite loop
  const applyLayout = useCallback(() => {
    // Check if we're already applying a layout or if there are no nodes
    if (isApplyingLayoutRef.current) {
      console.log("Skipping layout application - already in progress");
      return;
    }
    
    if (nodes.length === 0) {
      console.log("Skipping layout application - no nodes");
      return;
    }
    
    console.log(`Applying ${selectedLayout} layout to ${nodes.length} nodes`);
    isApplyingLayoutRef.current = true;
    
    try {
      // Get nodes from the current state without using the state directly
      const currentNodes = [...nodes];
      const currentEdges = [...edges];
      
      // Avoid creating a new state update cycle by working with copies
      let updatedNodes;
      switch (selectedLayout) {
        case 'circle':
          updatedNodes = layoutAlgorithms.circle(currentNodes);
          break;
        case 'force':
          updatedNodes = layoutAlgorithms.force(currentNodes, currentEdges);
          break;
        case 'hierarchical':
          updatedNodes = layoutAlgorithms.hierarchical(currentNodes, currentEdges);
          break;
        default:
          updatedNodes = layoutAlgorithms.force(currentNodes, currentEdges);
      }
      
      console.log('Layout algorithm calculated new positions for nodes:', updatedNodes.length);
      
      // Set nodes without triggering a re-render cascade
      setNodes(updatedNodes);
      
      // Fit view after a short delay to allow nodes to update
      setTimeout(() => {
        if (reactFlowInstance) {
          reactFlowInstance.fitView({ padding: 0.2 });
          // Update the viewport boundaries after layout changes
          calculateBoundaries();
        } else {
          console.warn("ReactFlow instance not available, can't fit view");
        }
        // Reset the flag to allow future layout applications
        isApplyingLayoutRef.current = false;
      }, 200);
    } catch (err) {
      console.error("Error applying layout:", err);
      isApplyingLayoutRef.current = false;
    }
  }, [nodes, edges, selectedLayout, setNodes, reactFlowInstance, calculateBoundaries]);
  
  // Replace the useEffect for initial layout application
  useEffect(() => {
    if (nodes.length === 0) {
      console.log('No nodes available for layout');
      return;
    }
    
    console.log('Nodes available for layout:', nodes.length);
    
    // Apply layout when nodes are available and either:
    // 1. It's the first render with nodes
    // 2. Or layout hasn't been calculated yet
    if (firstRenderRef.current || !layoutCalculatedRef.current) {
      console.log('Applying initial layout to nodes');
      
      // Use a slightly longer timeout to ensure DOM is ready
      const timer = setTimeout(() => {
        console.log('Running delayed layout application');
        try {
          // Don't show the loading indicator for initial layout to avoid flashing
          // but use the same transition logic as the layout button
          
          // Get current nodes and edges
          const currentNodes = [...nodes];
          const currentEdges = [...edges];
          
          // Apply the selected layout algorithm
          let updatedNodes;
          switch (selectedLayout) {
            case 'circle':
              updatedNodes = layoutAlgorithms.circle(currentNodes);
              break;
            case 'force':
              updatedNodes = layoutAlgorithms.force(currentNodes, currentEdges);
              break;
            case 'hierarchical':
              updatedNodes = layoutAlgorithms.hierarchical(currentNodes, currentEdges);
              break;
            default:
              updatedNodes = layoutAlgorithms.force(currentNodes, currentEdges);
          }
          
          // Create a transition version of nodes
          const transitionNodes = updatedNodes.map(node => {
            return {
              ...node,
              style: {
                ...node.style,
                transition: 'transform 400ms ease-in-out'
              }
            };
          });
          
          // Set nodes with transition property
          setNodes(transitionNodes);
          
          // Wait for transition to finish before fitting view
          setTimeout(() => {
            if (reactFlowInstance) {
              reactFlowInstance.fitView({ 
                padding: 0.3,
                duration: 300
              });
              calculateBoundaries();
            }
          }, 500);
          
          console.log('Layout applied successfully');
        } catch (err) {
          console.error('Error applying layout:', err);
        }
        layoutCalculatedRef.current = true;
        firstRenderRef.current = false;
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [nodes.length, edges, selectedLayout, setNodes, reactFlowInstance, calculateBoundaries, applyLayout]);
  
  // Separate function to save positions to the store
  const savePositionsToStore = useCallback(() => {
    if (nodes.length > 0) {
      const positionsMap = {};
      nodes.forEach(node => {
        positionsMap[node.id] = node.position;
      });
      updateAllNodePositions(positionsMap);
    }
  }, [nodes, updateAllNodePositions]);
  
  // Replace useEffect for loading nodes from store with this to prevent circular dependencies
  useEffect(() => {
    console.log('Store nodes/edges changed:', storeNodes.length, storeEdges.length);
    
    // Always load nodes from store when they change, regardless of layout calculation state
    if (storeNodes.length > 0) {
      console.log('Loading nodes from store:', storeNodes);
      
      // Ensure all nodes have the correct type property
      const typedNodes = storeNodes.map(node => ({
        ...node,
        type: 'knowledgeNode' // Ensure the type is always set
      }));
      
      // Update edges to use standard edge type
      const updatedEdges = storeEdges.map(edge => ({
        ...edge,
        type: 'default',  // Use default ReactFlow edge type
        animated: true,
        style: { stroke: '#555', strokeWidth: 2 },
        markerEnd: { type: 'arrow' }
      }));
      
      console.log('Typed nodes:', typedNodes);
      console.log('Updated edges:', updatedEdges);
      
      // Set nodes and edges
      setNodes(typedNodes);
      setEdges(updatedEdges);
      
      // Reset layout flags to ensure layout is applied
      layoutCalculatedRef.current = false;
      firstRenderRef.current = true;
    } else {
      console.log('No nodes in store');
    }
  }, [storeNodes, storeEdges, setNodes, setEdges]);
  
  // Handle new connections
  const handleConnect = useCallback(
    (params) => {
      // Modify the connection params to use default edge
      const updatedParams = {
        ...params,
        type: 'default',
        animated: true,
        style: { stroke: '#555', strokeWidth: 2 },
        markerEnd: { type: 'arrow' }
      };
      
      linkNodes(params.source, params.target);
      setEdges((eds) => addEdge(updatedParams, eds));
    },
    [linkNodes, setEdges]
  );
  
  // Save positions to store after drag or layout change
  useEffect(() => {
    // Save node positions to the store after they're stable
    const timer = setTimeout(() => {
      if (nodes.length > 0 && !isApplyingLayoutRef.current) {
        savePositionsToStore();
      }
    }, 100);
    
    return () => clearTimeout(timer);
  }, [nodes, isApplyingLayoutRef, savePositionsToStore]);
  
  // Update node positions in store when dragged
  const handleNodeDragStop = useCallback(
    (_, node) => {
      console.log('Node dragged to:', node.position);
      updateNodePosition(node.id, node.position);
      
      // Force save all positions
      setTimeout(() => {
        savePositionsToStore();
      }, 10);
    },
    [updateNodePosition, savePositionsToStore]
  );

  // Update onNodesChange handler to prevent layout application during drag operations
  const onNodesChangeHandler = useCallback(
    (changes) => {
      // Check if any change is a drag operation
      const isDragging = changes.some(
        (change) => change.type === 'position' && change.dragging
      );
      
      if (isDragging) {
        // Set flag to prevent layout application during drag
        isApplyingLayoutRef.current = true;
      }
      
      // Process the changes
      onNodesChange(changes);
      
      // Check if any node has stopped dragging
      const dragStopped = changes.some(
        (change) => change.type === 'position' && change.dragging === false
      );
      
      if (dragStopped) {
        // Get the node that stopped dragging
        const draggedNodeChange = changes.find(
          (change) => change.type === 'position' && change.dragging === false
        );
        
        if (draggedNodeChange) {
          console.log(`Node ${draggedNodeChange.id} drag stopped at position:`, 
            draggedNodeChange.position);
            
          // Find the current node
          const node = nodes.find(n => n.id === draggedNodeChange.id);
          if (node) {
            // Update position in store for this specific node
            updateNodePosition(node.id, node.position);
            
            // Force save all positions
            setTimeout(() => {
              savePositionsToStore();
            }, 10);
          }
        }
        
        // Reset the applying layout flag
        isApplyingLayoutRef.current = false;
      }
    },
    [nodes, onNodesChange, updateNodePosition, savePositionsToStore]
  );
  
  // Improve handleLayoutButtonClick to ensure layout is always applied correctly
  const handleLayoutButtonClick = useCallback((layout) => {
    // If the layout is already selected, just fit the view
    if (layout === selectedLayout) {
      console.log("Layout already selected, just fitting view");
      if (reactFlowInstance) {
        reactFlowInstance.fitView({ padding: 0.2 });
      }
      return;
    }
    
    console.log(`Switching layout from ${selectedLayout} to ${layout}`);
    
    // Reset the applying layout flag to ensure we can apply a new layout
    isApplyingLayoutRef.current = false;
    
    // Show layout changing indicator
    setIsLayoutChanging(true);
    
    // Update the selected layout first
    setSelectedLayout(layout);
    
    // Use requestAnimationFrame to ensure smoother transitions
    requestAnimationFrame(() => {
      // Get current nodes and edges
      const currentNodes = [...nodes];
      const currentEdges = [...edges];
      
      // Apply the selected layout algorithm
      let updatedNodes;
      switch (layout) {
        case 'circle':
          updatedNodes = layoutAlgorithms.circle(currentNodes);
          break;
        case 'force':
          updatedNodes = layoutAlgorithms.force(currentNodes, currentEdges);
          break;
        case 'hierarchical':
          updatedNodes = layoutAlgorithms.hierarchical(currentNodes, currentEdges);
          break;
        default:
          updatedNodes = layoutAlgorithms.force(currentNodes, currentEdges);
      }
      
      // Create a transition version of nodes by animating from current to new positions
      const transitionNodes = updatedNodes.map(node => {
        // Find the original node
        const originalNode = currentNodes.find(n => n.id === node.id);
        if (!originalNode) return node;
        
        return {
          ...node,
          // Use the same style but add transition for smooth movement
          style: {
            ...node.style,
            transition: 'transform 500ms ease-in-out'
          }
        };
      });
      
      // Set nodes with transition property
      setNodes(transitionNodes);
      
      // Wait for transition to finish before fitting view
      setTimeout(() => {
        if (reactFlowInstance) {
          reactFlowInstance.fitView({ 
            padding: 0.3,
            includeHiddenNodes: false,
            minZoom: 0.5,
            maxZoom: 1.5,
            duration: 400
          });
          calculateBoundaries();
        }
        
        // Save positions to store
        updateAllNodePositions(transitionNodes);
        
        // Reset layout changing indicator
        setIsLayoutChanging(false);
      }, 600); // Wait for transition to complete
    });
  }, [selectedLayout, nodes, edges, reactFlowInstance, setNodes, calculateBoundaries, updateAllNodePositions]);
  
  // Safety mechanism to ensure the loading state is reset
  useEffect(() => {
    // Set a maximum time for layout change operations
    let layoutTimer;
    if (isLayoutChanging) {
      layoutTimer = setTimeout(() => {
        setIsLayoutChanging(false);
      }, 3000); // Maximum 3 seconds wait time
    }
    
    return () => {
      if (layoutTimer) clearTimeout(layoutTimer);
    };
  }, [isLayoutChanging]);
  
  return (
    <div style={{ width: '100%', height: '100%' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChangeHandler}
        onEdgesChange={onEdgesChange}
        onConnect={handleConnect}
        onNodeDragStop={handleNodeDragStop}
        nodeTypes={nodeTypes}
        defaultEdgeOptions={{ 
          type: 'default', 
          animated: true,
          style: { stroke: '#555', strokeWidth: 2 },
          markerEnd: { type: 'arrow' }
        }}
        fitView
        fitViewOptions={{ 
          padding: 0.3,
          includeHiddenNodes: false,
          minZoom: 0.5,
          maxZoom: 1.5
        }}
        minZoom={0.1}
        maxZoom={2}
        defaultZoom={0.8}
        nodesDraggable={true}
        elementsSelectable={true}
        selectNodesOnDrag={false}
        translateExtent={viewportBoundary}
        style={{ width: '100%', height: '100%', background: '#f5f5f5' }}
        className="react-flow"
        proOptions={{ hideAttribution: true }}
      >
        <Background color="#aaa" gap={16} />
        <Controls showInteractive={false} />
        <MiniMap
          nodeColor={(node) => {
            if (node.data?.isBibleRef) return '#0ea5e9';
            return '#10b981';
          }}
          style={{
            width: 240,
            height: 160,
            border: '1px solid rgba(0, 0, 0, 0.1)',
            borderRadius: '4px'
          }}
          zoomable
          pannable
          onClick
          className="shadow-md bg-white bg-opacity-90"
          maskColor="rgba(0, 0, 0, 0.1)"
          nodeStrokeWidth={3}
        />
        
        {/* Viewport boundary visualization */}
        <Panel position="bottom-right" className="text-xs text-gray-500">
          {t('graph.boundary', {
            x1: viewportBoundary[0][0].toFixed(0),
            y1: viewportBoundary[0][1].toFixed(0),
            x2: viewportBoundary[1][0].toFixed(0),
            y2: viewportBoundary[1][1].toFixed(0)
          })}
        </Panel>
        
        <Panel position="top-left" className="bg-white p-3 rounded shadow">
          <div className="flex items-center space-x-4 mb-2">
            <h3 className="text-lg font-bold text-gray-800">{t('graph.title')}</h3>
            <button 
              className="px-2 py-1 bg-primary-100 text-primary-700 text-sm rounded-md"
              onClick={() => setShowTable(!showTable)}
            >
              {showTable ? t('graph.hideTable') : t('graph.showTable')}
            </button>
          </div>
          
          <div className="text-sm text-gray-500 mb-3">
            {nodes.length === 0 ? (
              t('graph.noNodes')
            ) : (
              t('graph.stats', {
                nodeCount: nodes.filter(n => !n.data.isBibleRef).length,
                bibleRefCount: nodes.filter(n => n.data.isBibleRef).length,
                connectionCount: edges.length
              })
            )}
          </div>
          
          <div className="border-t pt-2">
            <div className="text-sm font-medium text-gray-700 mb-1">{t('graph.layout')}:</div>
            <div className="flex flex-wrap gap-2">
              <button
                className={`px-2 py-1 text-xs rounded transition-colors duration-200 ${selectedLayout === 'circle' 
                  ? 'bg-blue-600 text-white font-semibold shadow-sm' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                onClick={() => handleLayoutButtonClick('circle')}
              >
                {t('graph.layoutTypes.circle')}
              </button>
              <button
                className={`px-2 py-1 text-xs rounded transition-colors duration-200 ${selectedLayout === 'force' 
                  ? 'bg-blue-600 text-white font-semibold shadow-sm' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                onClick={() => handleLayoutButtonClick('force')}
              >
                {t('graph.layoutTypes.force')}
              </button>
              <button
                className={`px-2 py-1 text-xs rounded transition-colors duration-200 ${selectedLayout === 'hierarchical' 
                  ? 'bg-blue-600 text-white font-semibold shadow-sm' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                onClick={() => handleLayoutButtonClick('hierarchical')}
              >
                {t('graph.layoutTypes.hierarchical')}
              </button>
              <button
                className="px-2 py-1 text-xs rounded bg-teal-100 text-teal-700 hover:bg-teal-200"
                onClick={() => {
                  reactFlowInstance.fitView({ padding: 0.2 });
                }}
              >
                {t('graph.actions.fitView')}
              </button>
              <button
                className="px-2 py-1 text-xs rounded bg-purple-100 text-purple-700 hover:bg-purple-200"
                onClick={calculateBoundaries}
              >
                {t('graph.actions.updateBoundary')}
              </button>
              <button
                className="px-2 py-1 text-xs rounded bg-green-100 text-green-700 hover:bg-green-200"
                onClick={savePositionsToStore}
              >
                {t('graph.actions.saveLayout')}
              </button>
            </div>
          </div>
        </Panel>
      </ReactFlow>
      
      {showTable && (
        <div className="absolute bottom-0 left-0 right-0 bg-white shadow-lg rounded-t-lg max-h-[50vh] overflow-y-auto">
          <NodeTable />
          <div className="p-2 text-right">
            <button 
              className="px-3 py-1 bg-gray-200 text-gray-700 text-sm rounded"
              onClick={() => setShowTable(false)}
            >
              {t('table.close')}
            </button>
          </div>
        </div>
      )}
      
      {isLayoutChanging && (
        <div className="fixed inset-0 bg-black bg-opacity-20 flex items-center justify-center z-50 pointer-events-none transition-opacity duration-300">
          <div className="bg-white p-4 rounded-lg shadow-lg flex items-center space-x-3 animate-fadeIn">
            <svg className="animate-spin h-5 w-5 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span className="text-gray-700 font-medium">
              {t('graph.applyingLayout', { layout: selectedLayout })}
            </span>
          </div>
        </div>
      )}
      
      {deleteConfirmation.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white p-5 rounded-lg shadow-lg max-w-md w-full">
            <h2 className="text-lg font-semibold mb-3">{t('deleteConfirm.title')}</h2>
            <p className="mb-4">{t('deleteConfirm.message', { title: deleteConfirmation.nodeTitle })}</p>
            <div className="flex justify-end space-x-3">
              <button 
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded text-gray-800"
                onClick={() => setDeleteConfirmation({ isOpen: false, nodeId: null, nodeTitle: '' })}
              >
                {t('deleteConfirm.cancel')}
              </button>
              <button 
                className="px-4 py-2 bg-red-500 hover:bg-red-600 rounded text-white"
                onClick={() => {
                  if (deleteConfirmation.nodeId) {
                    deleteNode(deleteConfirmation.nodeId);
                    // Update the nodes state to reflect the deletion
                    setNodes(nodes => nodes.filter(node => node.id !== deleteConfirmation.nodeId));
                    // Update the edges state to remove any connected edges
                    setEdges(edges => edges.filter(
                      edge => edge.source !== deleteConfirmation.nodeId && edge.target !== deleteConfirmation.nodeId
                    ));
                  }
                  setDeleteConfirmation({ isOpen: false, nodeId: null, nodeTitle: '' });
                }}
              >
                {t('deleteConfirm.delete')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Completely rewritten wrapper component
const GraphViewWithFlow = () => {
  const containerRef = useRef(null);
  
  useEffect(() => {
    // Force a resize event after render to ensure ReactFlow updates its dimensions
    const timer = setTimeout(() => {
      window.dispatchEvent(new Event('resize'));
    }, 100);
    
    return () => clearTimeout(timer);
  }, []);
  
  return (
    <div 
      ref={containerRef}
      style={{
        width: '100vw',
        height: 'calc(100vh - 64px)', 
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        overflow: 'hidden'
      }} 
    >
      <ReactFlowProvider>
        <div style={{ width: '100%', height: '100%', position: 'relative' }}>
          <GraphView />
        </div>
      </ReactFlowProvider>
    </div>
  );
};

export default GraphViewWithFlow; 