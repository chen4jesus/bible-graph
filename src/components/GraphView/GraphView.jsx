import React, { useCallback, useEffect, useState } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  Panel,
  addEdge,
  useNodesState,
  useEdgesState,
  getBezierPath,
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

const GraphView = () => {
  const storeNodes = useNodeStore(state => state.nodes);
  const storeEdges = useNodeStore(state => state.edges);
  const updateNodePosition = useNodeStore(state => state.updateNodePosition);
  const linkNodes = useNodeStore(state => state.linkNodes);
  const [showTable, setShowTable] = useState(false);
  
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  
  // Load nodes and edges from store
  useEffect(() => {
    console.log('GraphView: Loading nodes from store:', storeNodes.length);
    if (storeNodes.length > 0) {
      // Separate Bible reference nodes and regular nodes
      const bibleNodes = storeNodes.filter(node => node.data.isBibleRef);
      const regularNodes = storeNodes.filter(node => !node.data.isBibleRef);
      
      // Position regular nodes in a circle in the center
      const regularUpdatedNodes = regularNodes.map((node, index) => {
        const angle = (index / Math.max(1, regularNodes.length)) * 2 * Math.PI;
        const radius = 250;
        const x = radius * Math.cos(angle);
        const y = radius * Math.sin(angle);
        
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
        const x = radius * Math.cos(angle);
        const y = radius * Math.sin(angle);
        
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
      
      setNodes([...regularUpdatedNodes, ...bibleUpdatedNodes]);
    } else {
      setNodes([]);
    }
    
    console.log('GraphView: Loading edges from store:', storeEdges.length);
    setEdges(storeEdges);
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
      updateNodePosition(node.id, node.position);
    },
    [updateNodePosition]
  );
  
  return (
    <div style={{ width: '100%', height: '100vh' }} className="w-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={handleConnect}
        onNodeDragStop={handleNodeDragStop}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        defaultEdgeOptions={{ type: 'bezier', animated: true }}
        fitView
        snapToGrid
        snapGrid={[15, 15]}
        minZoom={0.1}
        maxZoom={2}
        nodesDraggable={true}
      >
        <Background color="#aaa" gap={16} />
        <Controls showInteractive={false} />
        <MiniMap
          nodeColor={(node) => {
            if (node.data?.isBibleRef) return '#0ea5e9';
            return '#10b981';
          }}
        />
        <Panel position="top-left" className="bg-white p-2 rounded shadow">
          <div className="flex items-center space-x-4">
            <h3 className="text-lg font-bold text-gray-800">Knowledge Graph</h3>
            <button 
              className="px-2 py-1 bg-primary-100 text-primary-700 text-sm rounded-md"
              onClick={() => setShowTable(!showTable)}
            >
              {showTable ? 'Hide Table' : 'Show Table'}
            </button>
          </div>
          <div className="text-sm text-gray-500 mt-1">
            {nodes.length === 0 ? (
              'No nodes created yet. Add nodes by highlighting Bible text.'
            ) : (
              `${nodes.filter(n => !n.data.isBibleRef).length} nodes, ${nodes.filter(n => n.data.isBibleRef).length} Bible references, ${edges.length} connections`
            )}
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