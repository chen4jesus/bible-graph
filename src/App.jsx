import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import BibleReader from './components/BibleReader/BibleReader';
import GraphView from './components/GraphView/GraphView';
import NodeTable from './components/NodeEditor/NodeTable';
import LanguageSwitcher from './components/LanguageSwitcher';
import useBibleStore from './store/useBibleStore';
import useNodeStore from './store/useNodeStore';
import './App.css';
import 'reactflow/dist/style.css';

const App = () => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('reader');
  const [splitView, setSplitView] = useState(false);
  const loadBibleData = useBibleStore(state => state.loadBibleData);
  const bibleData = useBibleStore(state => state.bibleData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showNodeTable, setShowNodeTable] = useState(false);
  const nodeCount = useNodeStore(state => state.nodes.length);
  const createBibleReferenceNode = useNodeStore(state => state.createBibleReferenceNode);
  const linkNodes = useNodeStore(state => state.linkNodes);
  const nodes = useNodeStore(state => state.nodes);
  const [nodeTableCollapsed, setNodeTableCollapsed] = useState(false);
  
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

  // Handle switching to Knowledge Graph
  const handleGraphButtonClick = () => {
    setActiveTab('graph');
    setSplitView(true);
  };

  // Handle switching to Bible Reader
  const handleReaderButtonClick = () => {
    setActiveTab('reader');
    setSplitView(false);
  };
  
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
            <h1 className="text-2xl font-bold text-gray-900">{t('appTitle')}</h1>
            
            <div className="flex space-x-4 items-center">
              {nodeCount > 0 && (activeTab === 'reader' || splitView) && (
                <button
                  className="px-3 py-1 text-sm bg-primary-100 text-primary-700 rounded-md"
                  onClick={() => setShowNodeTable(showNodeTable ? false : true)}
                >
                  {showNodeTable ? t('graph.hideTable') : t('graph.showTable')} ({nodeCount})
                </button>
              )}
              <button
                className={`px-3 py-2 rounded-md text-sm font-medium ${
                  activeTab === 'reader' 
                    ? 'bg-primary-100 text-primary-700' 
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
                onClick={handleReaderButtonClick}
              >
                {t('nav.bibleReader')}
              </button>
              <button
                className={`px-3 py-2 rounded-md text-sm font-medium ${
                  activeTab === 'graph' 
                    ? 'bg-primary-100 text-primary-700' 
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
                onClick={handleGraphButtonClick}
              >
                {t('nav.knowledgeGraph')}
              </button>
              <LanguageSwitcher />
            </div>
          </div>
        </div>
      </header>
      
      {/* Main Content */}
      <main className="flex-1 flex overflow-hidden" style={{ height: 'calc(100vh - 64px)', width: '100%' }}>
        {/* When not in split view, show either Bible Reader or Graph View based on activeTab */}
        {!splitView && (
          activeTab === 'reader' ? (
            <BibleReader />
          ) : (
            // Graph container with key to force remount
            <div key="graph-container" style={{ width: '100%', height: '100%' }}>
              <GraphView />
            </div>
          )
        )}

        {/* When in split view, show both Bible Reader and Graph View side by side */}
        {splitView && (
          <div className="flex h-full" style={{ height: 'calc(100vh - 64px)', width: '100%', position: 'relative' }}>
            <div className="w-1/2 border-r overflow-auto" style={{ height: '100%' }}>
              <BibleReader
                showNodeTable={showNodeTable} 
                setShowNodeTable={setShowNodeTable}
              />
            </div>
            <div className="w-1/2" style={{ 
              height: '100%', 
              display: 'flex', 
              flexDirection: 'column',
              overflow: 'hidden',
              position: 'relative'
            }}>
              <div style={{ 
                position: 'absolute', 
                top: 0, 
                right: 0, 
                bottom: 0, 
                left: 0,
                overflow: 'hidden'
              }}>
                <GraphView />
              </div>
            </div>
          </div>
        )}
        
        {/* Node Table Overlay (shown in both Reader and Split views) */}
        {(activeTab === 'reader' || splitView) && showNodeTable && nodeCount > 0 && (
          <div className={`node-table-container ${nodeTableCollapsed ? 'h-12' : ''}`}>
            {/* Table header with collapse/expand toggle */}
            <div 
              className="node-table-header"
              onClick={() => setNodeTableCollapsed(!nodeTableCollapsed)}
            >
              <h2 className="font-semibold text-gray-700">
                {t('tabs.userNodes')} ({nodeCount})
              </h2>
              <div className="flex items-center space-x-2">
                <button 
                  className="p-1 rounded-md hover:bg-gray-200"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowNodeTable(false);
                  }}
                  aria-label="Close"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
                <div className="transform">
                  <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 text-gray-500 node-table-chevron ${nodeTableCollapsed ? 'collapsed' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                  </svg>
                </div>
              </div>
            </div>
            
            {/* Only render the table content when not collapsed */}
            {!nodeTableCollapsed && (
              <div className="node-table-content pb-2">
                <NodeTable />
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default App;