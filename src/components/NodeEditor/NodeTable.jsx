import React from 'react';
import useNodeStore from '../../store/useNodeStore';
import useBibleStore from '../../store/useBibleStore';

const NodeTable = () => {
  const nodes = useNodeStore(state => state.nodes.filter(node => !node.data.isBibleRef));
  const setCurrentLocation = useBibleStore(state => state.setCurrentLocation);
  
  const handleBibleRefClick = (bibleReference) => {
    if (bibleReference) {
      const [book, chapter, verse] = bibleReference.split('.');
      setCurrentLocation(book, chapter, verse);
    }
  };
  
  if (nodes.length === 0) {
    return (
      <div className="p-4 text-center">
        <p className="text-gray-500">No knowledge nodes have been created yet. Highlight text in the Bible reader to create nodes.</p>
      </div>
    );
  }
  
  return (
    <div className="overflow-x-auto">
      <h2 className="text-xl font-bold mb-4 px-4">Knowledge Nodes ({nodes.length})</h2>
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Title
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Created At
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Bible Reference
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Description
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Connections
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {nodes.map((node) => {
            const { title, datetime, description, bibleReference, referencedBy = [], referencedTo = [] } = node.data;
            const date = new Date(datetime).toLocaleString();
            const connections = (referencedBy?.length || 0) + (referencedTo?.length || 0);
            
            return (
              <tr key={node.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">{title}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-500">{date}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {bibleReference && (
                    <div 
                      className="text-sm text-primary-600 cursor-pointer hover:underline"
                      onClick={() => handleBibleRefClick(bibleReference)}
                    >
                      {bibleReference}
                    </div>
                  )}
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm text-gray-900 max-w-xs truncate">{description}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-500">{connections}</div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default NodeTable; 