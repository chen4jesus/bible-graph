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
          <>
            <div className="w-1/2 border-r" style={{ height: '100%' }}>
              <BibleReader />
            </div>
            <div className="w-1/2" style={{ height: '100%' }}>
              <GraphView />
            </div>
          </>
        )}
        
        {/* Node Table Overlay (shown in both Reader and Split views) */}
        {(activeTab === 'reader' || splitView) && showNodeTable && nodeCount > 0 && (
          <div 
            className={`absolute transition-all duration-300 left-0 right-0 bg-white shadow-lg rounded-t-lg z-10 node-table-container ${
              showNodeTable === 'collapsed' ? 'bottom-0 h-12' : 'bottom-0 max-h-[50vh]'
            }`}
            style={{ 
              boxShadow: '0 -4px 6px -1px rgba(0, 0, 0, 0.1), 0 -2px 4px -1px rgba(0, 0, 0, 0.06)'
            }}
          >
            {/* Collapse/Expand Toggle Bar */}
            <div 
              className="h-12 px-4 flex items-center justify-between bg-gray-50 border-b node-table-header"
              onClick={() => setShowNodeTable(showNodeTable === 'collapsed' ? true : 'collapsed')}
            >
              <h2 className="text-lg font-semibold text-gray-700">
                {t('tabs.totalNodes')} ({nodeCount})
              </h2>
              <div className="flex items-center space-x-2">
                {showNodeTable !== 'collapsed' && (
                  <button 
                    className="px-3 py-1 bg-gray-200 text-gray-700 text-sm rounded hover:bg-gray-300"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowNodeTable(false);
                    }}
                  >
                    {t('table.close')}
                  </button>
                )}
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  className={`h-5 w-5 node-table-chevron ${showNodeTable === 'collapsed' ? 'collapsed' : ''}`} 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                </svg>
              </div>
            </div>
            
            {/* Table Content - only rendered when expanded */}
            {showNodeTable !== 'collapsed' && (
              <div className="overflow-y-auto" style={{ maxHeight: 'calc(50vh - 48px)' }}>
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