import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { nanoid } from 'nanoid';

const useNodeStore = create(
  persist(
    (set, get) => ({
      nodes: [],
      edges: [],
      selectedNode: null,
      
      addNode: (nodeData) => {
        const { title, description, bibleReference, referencedBy = [], referencedTo = [] } = nodeData;
        const newNode = {
          id: nanoid(),
          type: 'knowledgeNode',
          position: { x: Math.random() * 300, y: Math.random() * 300 },
          data: {
            title,
            datetime: new Date().toISOString(),
            description,
            bibleReference,
            referencedBy,
            referencedTo,
          },
        };
        
        set(state => ({
          nodes: [...state.nodes, newNode]
        }));
        
        // If we have a Bible reference, create a link to it
        if (bibleReference) {
          const bibleRefNodeId = get().createBibleReferenceNode(bibleReference);
          get().linkNodes(newNode.id, bibleRefNodeId);
        }
        
        return newNode.id;
      },
      
      createBibleReferenceNode: (bibleReference) => {
        const { nodes } = get();
        
        // Check if a node for this Bible reference already exists
        const existingNode = nodes.find(
          node => node.data.isBibleRef && node.data.bibleReference === bibleReference
        );
        
        if (existingNode) {
          return existingNode.id;
        }
        
        // Create a new Bible reference node
        const [book, chapter, verse] = bibleReference.split('.');
        const newNode = {
          id: `bible-${bibleReference}`,
          type: 'knowledgeNode',
          position: { x: Math.random() * 300 - 150, y: Math.random() * 300 - 150 },
          data: {
            title: `${book} ${chapter}:${verse}`,
            datetime: new Date().toISOString(),
            description: `Bible reference: ${book} ${chapter}:${verse}`,
            bibleReference,
            isBibleRef: true,
            referencedBy: [],
            referencedTo: [],
          },
        };
        
        set(state => ({
          nodes: [...state.nodes, newNode]
        }));
        
        return newNode.id;
      },
      
      linkNodes: (sourceId, targetId) => {
        // Check if edge already exists
        const { edges } = get();
        const edgeExists = edges.some(
          edge => edge.source === sourceId && edge.target === targetId
        );
        
        if (edgeExists) return;
        
        // Create edge
        const edgeId = nanoid();
        const newEdge = {
          id: edgeId,
          source: sourceId,
          target: targetId,
          type: 'bezier',
          animated: true,
          markerEnd: {
            type: 'arrow',
          },
          style: {
            strokeWidth: 2,
            stroke: '#555',
          },
        };
        
        // Update nodes with references (bidirectional)
        set(state => {
          const updatedNodes = state.nodes.map(node => {
            if (node.id === sourceId) {
              return {
                ...node,
                data: {
                  ...node.data,
                  referencedTo: [...(node.data.referencedTo || []), targetId]
                }
              };
            }
            if (node.id === targetId) {
              return {
                ...node,
                data: {
                  ...node.data,
                  referencedBy: [...(node.data.referencedBy || []), sourceId]
                }
              };
            }
            return node;
          });
          
          return {
            nodes: updatedNodes,
            edges: [...state.edges, newEdge]
          };
        });
      },
      
      updateNodePosition: (nodeId, position) => {
        set(state => ({
          nodes: state.nodes.map(node => 
            node.id === nodeId ? { ...node, position } : node
          )
        }));
      },
      
      updateNode: (nodeId, data) => {
        set(state => ({
          nodes: state.nodes.map(node => 
            node.id === nodeId ? { ...node, data: { ...node.data, ...data } } : node
          )
        }));
      },
      
      removeNode: (nodeId) => {
        set(state => {
          // Remove references to the node from other nodes
          const updatedNodes = state.nodes
            .filter(node => node.id !== nodeId)
            .map(node => ({
              ...node,
              data: {
                ...node.data,
                referencedTo: node.data.referencedTo?.filter(id => id !== nodeId) || [],
                referencedBy: node.data.referencedBy?.filter(id => id !== nodeId) || []
              }
            }));
            
          return {
            nodes: updatedNodes,
            edges: state.edges.filter(edge => edge.source !== nodeId && edge.target !== nodeId)
          };
        });
      },
      
      setSelectedNode: (nodeId) => {
        set({ selectedNode: nodeId });
      },
      
      clearSelectedNode: () => {
        set({ selectedNode: null });
      }
    }),
    {
      name: 'knowledge-nodes-storage'
    }
  )
);

export default useNodeStore; 