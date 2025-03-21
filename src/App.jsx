import React, { useState, useEffect } from 'react';
import BibleReader from './components/BibleReader/BibleReader';
import GraphView from './components/GraphView/GraphView';
import NodeTable from './components/NodeEditor/NodeTable';
import useBibleStore from './store/useBibleStore';
import useNodeStore from './store/useNodeStore';
import 'reactflow/dist/style.css';

const App = () => {
  const [activeTab, setActiveTab] = useState('reader');
  const loadBibleData = useBibleStore(state => state.loadBibleData);
  const bibleData = useBibleStore(state => state.bibleData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showNodeTable, setShowNodeTable] = useState(false);
  const nodeCount = useNodeStore(state => state.nodes.length);
  const createBibleReferenceNode = useNodeStore(state => state.createBibleReferenceNode);
  const linkNodes = useNodeStore(state => state.linkNodes);
  const nodes = useNodeStore(state => state.nodes);
  
  // Migrate old nodes to add Bible reference connections
  useEffect(() => {
    const migrateNodes = () => {
      const regularNodes = nodes.filter(node => !node.data.isBibleRef);
      
      // For each regular node with a Bible reference
      regularNodes.forEach(node => {
        if (node.data.bibleReference) {
          // Check if connections already exist
          const hasRefConnection = node.data.referencedTo && 
            node.data.referencedTo.some(id => id.startsWith('bible-'));
          
          if (!hasRefConnection) {
            console.log('Migrating node:', node.id, 'to connect to Bible reference:', node.data.bibleReference);
            // Create or get Bible reference node
            const bibleRefNodeId = createBibleReferenceNode(node.data.bibleReference);
            // Link the node to the Bible reference node
            linkNodes(node.id, bibleRefNodeId);
          }
        }
      });
    };
    
    // Only run after Bible data is loaded and if we have nodes
    if (!loading && bibleData && nodes.length > 0) {
      migrateNodes();
    }
  }, [loading, bibleData, nodes, createBibleReferenceNode, linkNodes]);
  
  useEffect(() => {
    const loadBible = async () => {
      try {
        console.log('Attempting to load Bible data...');
        // Try to load the sample file first for testing
        let response;
        try {
          response = await fetch('/Bible_Chinese_CUVS.xml');
          console.log('Using bible file');
        } catch (sampleError) {
          console.log('Full bible file not found, trying the sample file');
          response = await fetch('/sampleBible.xml');
        }
        
        if (!response.ok) {
          throw new Error(`Failed to fetch Bible XML: ${response.status} ${response.statusText}`);
        }
        
        const xmlText = await response.text();
        console.log('XML loaded, length:', xmlText.length);
        console.log('First 100 chars:', xmlText.substring(0, 100));
        
        await loadBibleData(xmlText);
        console.log('Bible data loaded successfully');
        setLoading(false);
      } catch (err) {
        console.error('Failed to load Bible data:', err);
        setError(`Failed to load Bible data: ${err.message}`);
        setLoading(false);
      }
    };
    
    loadBible();
  }, [loadBibleData]);
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading Bible data...</div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <div className="text-xl text-red-600 mb-4">{error}</div>
        <button 
          className="px-4 py-2 bg-primary-600 text-white rounded"
          onClick={() => window.location.reload()}
        >
          Retry
        </button>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <h1 className="text-2xl font-bold text-gray-900">Bible Knowledge Graph</h1>
            
            <div className="flex space-x-4 items-center">
              {nodeCount > 0 && activeTab === 'reader' && (
                <button
                  className="px-3 py-1 text-sm bg-primary-100 text-primary-700 rounded-md"
                  onClick={() => setShowNodeTable(!showNodeTable)}
                >
                  {showNodeTable ? 'Hide' : 'Show'} Nodes ({nodeCount})
                </button>
              )}
              <button
                className={`px-3 py-2 rounded-md text-sm font-medium ${
                  activeTab === 'reader' 
                    ? 'bg-primary-100 text-primary-700' 
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
                onClick={() => setActiveTab('reader')}
              >
                Bible Reader
              </button>
              <button
                className={`px-3 py-2 rounded-md text-sm font-medium ${
                  activeTab === 'graph' 
                    ? 'bg-primary-100 text-primary-700' 
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
                onClick={() => setActiveTab('graph')}
              >
                Knowledge Graph
              </button>
            </div>
          </div>
        </div>
      </header>
      
      {/* Main Content */}
      <main className="flex-1 relative" style={{ height: 'calc(100vh - 64px)' }}>
        {activeTab === 'reader' ? <BibleReader /> : <GraphView />}
        
        {/* Node Table Overlay (only in Reader view) */}
        {activeTab === 'reader' && showNodeTable && nodeCount > 0 && (
          <div className="absolute bottom-0 left-0 right-0 bg-white shadow-lg rounded-t-lg max-h-[50vh] overflow-y-auto z-10">
            <NodeTable />
            <div className="p-2 text-right">
              <button 
                className="px-3 py-1 bg-gray-200 text-gray-700 text-sm rounded"
                onClick={() => setShowNodeTable(false)}
              >
                Close
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default App; 