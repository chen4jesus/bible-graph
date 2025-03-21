import React, { useCallback, useEffect, useState, useRef } from 'react';
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
  applyEdgeChanges
} from 'reactflow';
import 'reactflow/dist/style.css'; // Import the ReactFlow styles
import useNodeStore from '../../store/useNodeStore';
import KnowledgeNode from './KnowledgeNode';
import NodeTable from '../NodeEditor/NodeTable';

// Define custom edge component for bezier edges
const BezierEdge = ({ id, source, target, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, style = {} }) => {
  const [edgePath] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  return (
    <path
      id={id}
      className="react-flow__edge-path"
      d={edgePath}
      strokeWidth={2}
      stroke="#b1b1b7"
      {...style}
    />
  );
};

const nodeTypes = {
  knowledgeNode: KnowledgeNode,
};

const edgeTypes = {
  bezier: BezierEdge,
};

// Layout algorithms for positioning nodes
const layoutAlgorithms = {
  circle: (nodes, centerX = 0, centerY = 0) => {
    const regularNodes = nodes.filter(node => !node.data.isBibleRef);
    const bibleNodes = nodes.filter(node => node.data.isBibleRef);
    
    // Position regular nodes in a circle in the center
    const regularUpdatedNodes = regularNodes.map((node, index) => {
      const angle = (index / Math.max(1, regularNodes.length)) * 2 * Math.PI;
      const radius = 250;
      const x = centerX + radius * Math.cos(angle);
      const y = centerY + radius * Math.sin(angle);
      
      return {
        ...node,
        position: { x, y },
        style: { ...node.style }
      };
    });
    
    // Position Bible reference nodes in a wider circle around regular nodes
    const bibleUpdatedNodes = bibleNodes.map((node, index) => {
      const angle = (index / Math.max(1, bibleNodes.length)) * 2 * Math.PI;
      const radius = 500;
      const x = centerX + radius * Math.cos(angle);
      const y = centerY + radius * Math.sin(angle);
      
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
    
    return [...regularUpdatedNodes, ...bibleUpdatedNodes];
  },
  
  force: (nodes, edges, iterations = 50) => {
    // Simple force-directed layout
    const nodeMap = {};
    const updatedNodes = [...nodes];
    
    // Initialize node positions randomly if not set
    updatedNodes.forEach(node => {
      if (!node.position) {
        node.position = { 
          x: Math.random() * 800 - 400, 
          y: Math.random() * 800 - 400 
        };
      }
      nodeMap[node.id] = node;
    });
    
    // Perform iterations of force-directed algorithm
    for (let i = 0; i < iterations; i++) {
      // Repulsive forces between all nodes
      for (let j = 0; j < updatedNodes.length; j++) {
        for (let k = j + 1; k < updatedNodes.length; k++) {
          const node1 = updatedNodes[j];
          const node2 = updatedNodes[k];
          
          const dx = node2.position.x - node1.position.x;
          const dy = node2.position.y - node1.position.y;
          const distance = Math.sqrt(dx * dx + dy * dy) || 1;
          
          // Stronger repulsion for Bible nodes
          const repulsionStrength = 10000 / Math.max(distance, 150);
          const repulsionFactor = node1.data.isBibleRef !== node2.data.isBibleRef ? 0.5 : 1;
          
          const fx = (dx / distance) * repulsionStrength * repulsionFactor;
          const fy = (dy / distance) * repulsionStrength * repulsionFactor;
          
          node2.position.x += fx;
          node2.position.y += fy;
          node1.position.x -= fx;
          node1.position.y -= fy;
        }
      }
      
      // Attractive forces along edges
      edges.forEach(edge => {
        const source = nodeMap[edge.source];
        const target = nodeMap[edge.target];
        
        if (source && target) {
          const dx = target.position.x - source.position.x;
          const dy = target.position.y - source.position.y;
          const distance = Math.sqrt(dx * dx + dy * dy) || 1;
          
          // Stronger attraction if one is a Bible node
          const attractionStrength = 0.05 * distance;
          
          const fx = (dx / distance) * attractionStrength;
          const fy = (dy / distance) * attractionStrength;
          
          source.position.x += fx;
          source.position.y += fy;
          target.position.x -= fx;
          target.position.y -= fy;
        }
      });
    }
    
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
    
    // Create a map of all nodes
    nodes.forEach(node => {
      nodeMap[node.id] = { ...node, children: [] };
      
      // Bible reference nodes always at level 0
      if (node.data.isBibleRef) {
        levels[node.id] = 0;
        rootNodes.push(node.id);
      }
    });
    
    // Build the hierarchy based on edges
    edges.forEach(edge => {
      if (nodeMap[edge.source] && nodeMap[edge.target]) {
        nodeMap[edge.source].children.push(edge.target);
      }
    });
    
    // Find non-Bible nodes without incoming edges
    nodes.forEach(node => {
      if (!node.data.isBibleRef) {
        const hasIncoming = edges.some(edge => edge.target === node.id);
        if (!hasIncoming) {
          rootNodes.push(node.id);
          levels[node.id] = 0;
        }
      }
    });
    
    // Assign levels to all nodes through BFS
    const queue = [...rootNodes];
    while (queue.length > 0) {
      const nodeId = queue.shift();
      const node = nodeMap[nodeId];
      const currentLevel = levels[nodeId];
      
      node.children.forEach(childId => {
        if (levels[childId] === undefined || levels[childId] < currentLevel + 1) {
          levels[childId] = currentLevel + 1;
          queue.push(childId);
        }
      });
    }
    
    // Position nodes based on their levels
    const levelCounts = {};
    const updatedNodes = [];
    
    Object.keys(levels).forEach(nodeId => {
      const level = levels[nodeId];
      levelCounts[level] = (levelCounts[level] || 0) + 1;
    });
    
    const levelPositions = {};
    
    Object.keys(levels).forEach(nodeId => {
      const node = nodeMap[nodeId];
      const level = levels[nodeId];
      levelPositions[level] = levelPositions[level] || 0;
      
      const levelWidth = 300;
      const nodesInLevel = levelCounts[level];
      const xSpacing = 200;
      const ySpacing = 150;
      
      const y = level * ySpacing;
      const x = levelPositions[level] * xSpacing - ((nodesInLevel - 1) * xSpacing / 2);
      
      levelPositions[level]++;
      
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
    
    return updatedNodes;
  }
};

const GraphView = () => {
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
  
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  
  // Modify the applyLayout function to avoid the infinite loop
  const applyLayout = useCallback(() => {
    // Check if we're already applying a layout or if there are no nodes
    if (isApplyingLayoutRef.current || nodes.length === 0) {
      console.log("Skipping layout application - already in progress or no nodes");
      return;
    }
    
    console.log(`Applying ${selectedLayout} layout to ${nodes.length} nodes`);
    isApplyingLayoutRef.current = true;
    
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
    
    // Set nodes without triggering a re-render cascade
    setNodes(updatedNodes);
    
    // Fit view after a short delay to allow nodes to update
    setTimeout(() => {
      if (reactFlowInstance) {
        reactFlowInstance.fitView({ padding: 0.2 });
      }
      // Reset the flag to allow future layout applications
      isApplyingLayoutRef.current = false;
    }, 100);
  }, [nodes, edges, selectedLayout, setNodes, reactFlowInstance]);
  
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
  
  // Replace the useEffect for initial layout application
  useEffect(() => {
    if (!firstRenderRef.current || nodes.length === 0 || layoutCalculatedRef.current) {
      return;
    }
    
    console.log('First render with nodes, applying initial layout');
    
    // Set a timeout to ensure this runs after the nodes are properly set
    const timer = setTimeout(() => {
      if (nodes.length > 0 && !layoutCalculatedRef.current) {
        applyLayout();
        layoutCalculatedRef.current = true;
        firstRenderRef.current = false;
      }
    }, 300);
    
    return () => clearTimeout(timer);
  }, [nodes.length, applyLayout]);
  
  // Replace useEffect for loading nodes from store with this to prevent circular dependencies
  useEffect(() => {
    if (storeNodes.length > 0 && !layoutCalculatedRef.current) {
      console.log('Loading nodes from store');
      
      // Set nodes and edges without triggering layout application
      setNodes(storeNodes);
      setEdges(storeEdges);
    }
  }, [storeNodes, storeEdges, setNodes, setEdges]);
  
  // Handle new connections
  const handleConnect = useCallback(
    (params) => {
      linkNodes(params.source, params.target);
      setEdges((eds) => addEdge(params, eds));
    },
    [linkNodes, setEdges]
  );
  
  // Update node positions in store when dragged
  const handleNodeDragStop = useCallback(
    (_, node) => {
      console.log('Node dragged to:', node.position);
      updateNodePosition(node.id, node.position);
    },
    [updateNodePosition]
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
          }
        }
        
        // Reset the applying layout flag
        isApplyingLayoutRef.current = false;
      }
    },
    [nodes, onNodesChange, updateNodePosition]
  );
  
  // Modify handleLayoutButtonClick to prevent multiple layout applications
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
    
    // Update the selected layout first
    setSelectedLayout(layout);
    
    // Delay applying the new layout to allow state to update
    setTimeout(() => {
      if (!isApplyingLayoutRef.current) {
        applyLayout();
        
        // Save positions to store after layout change with a delay
        setTimeout(() => {
          updateAllNodePositions(nodes);
        }, 200);
      }
    }, 50);
  }, [selectedLayout, applyLayout, reactFlowInstance, nodes, updateAllNodePositions]);
  
  return (
    <div style={{ width: '100%', height: '100vh' }} className="w-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChangeHandler}
        onEdgesChange={onEdgesChange}
        onConnect={handleConnect}
        onNodeDragStop={handleNodeDragStop}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        defaultEdgeOptions={{ type: 'bezier', animated: true }}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.1}
        maxZoom={2}
        nodesDraggable={true}
        elementsSelectable={true}
        selectNodesOnDrag={false}
      >
        <Background color="#aaa" gap={16} />
        <Controls showInteractive={false} />
        <MiniMap
          nodeColor={(node) => {
            if (node.data?.isBibleRef) return '#0ea5e9';
            return '#10b981';
          }}
        />
        <Panel position="top-left" className="bg-white p-3 rounded shadow">
          <div className="flex items-center space-x-4 mb-2">
            <h3 className="text-lg font-bold text-gray-800">Knowledge Graph</h3>
            <button 
              className="px-2 py-1 bg-primary-100 text-primary-700 text-sm rounded-md"
              onClick={() => setShowTable(!showTable)}
            >
              {showTable ? 'Hide Table' : 'Show Table'}
            </button>
          </div>
          
          <div className="text-sm text-gray-500 mb-3">
            {nodes.length === 0 ? (
              'No nodes created yet. Add nodes by highlighting Bible text.'
            ) : (
              `${nodes.filter(n => !n.data.isBibleRef).length} nodes, ${nodes.filter(n => n.data.isBibleRef).length} Bible references, ${edges.length} connections`
            )}
          </div>
          
          <div className="border-t pt-2">
            <div className="text-sm font-medium text-gray-700 mb-1">Layout:</div>
            <div className="flex flex-wrap gap-2">
              <button
                className={`px-2 py-1 text-xs rounded ${selectedLayout === 'circle' 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                onClick={() => handleLayoutButtonClick('circle')}
              >
                Circle
              </button>
              <button
                className={`px-2 py-1 text-xs rounded ${selectedLayout === 'force' 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                onClick={() => handleLayoutButtonClick('force')}
              >
                Force-Directed
              </button>
              <button
                className={`px-2 py-1 text-xs rounded ${selectedLayout === 'hierarchical' 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                onClick={() => handleLayoutButtonClick('hierarchical')}
              >
                Hierarchical
              </button>
              <button
                className="px-2 py-1 text-xs rounded bg-teal-100 text-teal-700 hover:bg-teal-200"
                onClick={() => {
                  reactFlowInstance.fitView({ padding: 0.2 });
                }}
              >
                Fit View
              </button>
              <button
                className="px-2 py-1 text-xs rounded bg-green-100 text-green-700 hover:bg-green-200"
                onClick={savePositionsToStore}
              >
                Save Layout
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
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default GraphView; 