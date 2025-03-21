import React, { useEffect, useState } from 'react';
import useBibleStore from '../../store/useBibleStore';
import useNodeStore from '../../store/useNodeStore';
import NodeEditor from '../NodeEditor/NodeEditor';
import { getSelectedText, clearSelection } from '../../utils/textHighlighter';
import { getChapterVerses, getBooks, getBookChapters } from '../../utils/bibleParser';

const BibleReader = () => {
  const bibleData = useBibleStore(state => state.bibleData);
  const currentBook = useBibleStore(state => state.currentBook);
  const currentChapter = useBibleStore(state => state.currentChapter);
  const currentVerse = useBibleStore(state => state.currentVerse);
  const setCurrentLocation = useBibleStore(state => state.setCurrentLocation);
  const highlightedText = useBibleStore(state => state.highlightedText);
  const setHighlightedText = useBibleStore(state => state.setHighlightedText);
  const clearHighlightedText = useBibleStore(state => state.clearHighlightedText);
  const nodeCount = useNodeStore(state => state.nodes.length);
  
  const [selectedText, setSelectedText] = useState(null);
  const [showNodeEditor, setShowNodeEditor] = useState(false);
  const [showHint, setShowHint] = useState(true);
  
  // Get books and chapters for navigation
  const books = bibleData ? getBooks(bibleData) : [];
  const chapters = bibleData ? getBookChapters(bibleData, currentBook) : [];
  
  // Get current chapter verses
  const verses = bibleData 
    ? getChapterVerses(bibleData, currentBook, currentChapter) 
    : [];
  
  // Scroll to current verse if specified
  useEffect(() => {
    if (currentVerse) {
      const verseElement = document.getElementById(`verse-${currentVerse}`);
      if (verseElement) {
        verseElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [currentVerse, verses]);
  
  // Reset hint display after nodes are created
  useEffect(() => {
    if (nodeCount > 0) {
      setShowHint(false);
    }
  }, [nodeCount]);
  
  // Handle text selection
  const handleMouseUp = () => {
    const selection = getSelectedText();
    if (selection) {
      console.log('Text selected:', selection);
      setSelectedText(selection);
      setShowNodeEditor(true);
      setHighlightedText(selection.text, selection.verseRef);
      setShowHint(false);
    }
  };
  
  // Handle book change
  const handleBookChange = (e) => {
    const newBook = e.target.value;
    setCurrentLocation(newBook, '1');
  };
  
  // Handle chapter change
  const handleChapterChange = (e) => {
    const newChapter = e.target.value;
    setCurrentLocation(currentBook, newChapter);
  };
  
  // Close node editor
  const handleCloseNodeEditor = () => {
    setShowNodeEditor(false);
    clearHighlightedText();
    clearSelection();
  };
  
  // If no Bible data yet, show loading
  if (!bibleData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading Bible data...</div>
      </div>
    );
  }
  
  // Find current book name
  const currentBookObj = books.find(b => b.id === currentBook);
  const bookName = currentBookObj ? currentBookObj.name : '';
  
  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Navigation */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4 items-center">
        <div className="flex-1">
          <label htmlFor="book-select" className="block text-sm font-medium text-gray-700 mb-1">
            Book
          </label>
          <select
            id="book-select"
            className="w-full p-2 border border-gray-300 rounded"
            value={currentBook}
            onChange={handleBookChange}
          >
            {books.map((book) => (
              <option key={book.id} value={book.id}>
                {book.name}
              </option>
            ))}
          </select>
        </div>
        
        <div className="flex-1">
          <label htmlFor="chapter-select" className="block text-sm font-medium text-gray-700 mb-1">
            Chapter
          </label>
          <select
            id="chapter-select"
            className="w-full p-2 border border-gray-300 rounded"
            value={currentChapter}
            onChange={handleChapterChange}
          >
            {chapters.map((chapter) => (
              <option key={chapter} value={chapter}>
                {chapter}
              </option>
            ))}
          </select>
        </div>
      </div>
      
      {/* Creation hint */}
      {showHint && (
        <div className="bg-primary-50 border-l-4 border-primary-500 p-4 mb-6 text-sm text-primary-700">
          <p className="font-medium">{t('hintTitle')}</p>
          <p>Select any text in the Bible to create a knowledge node. Nodes will appear in the Knowledge Graph view.</p>
        </div>
      )}
      
      {/* Bible Text */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 text-center">{bookName}</h1>
        <h2 className="text-xl font-semibold mb-6 text-center">Chapter {currentChapter}</h2>
        
        <div 
          className="leading-relaxed text-lg bible-text-container"
          onMouseUp={handleMouseUp}
        >
          {verses.map((verse) => (
            <div 
              key={verse.number}
              id={`verse-${verse.number}`}
              className={`mb-4 ${currentVerse === verse.number ? 'bg-yellow-50 -mx-2 px-2 py-1 rounded' : ''}`}
              data-verse-ref={`${currentBook}.${currentChapter}.${verse.number}`}
            >
              <sup className="text-xs font-bold text-gray-500 mr-1">{verse.number}</sup>
              <span className="text-gray-900">{verse.text}</span>
            </div>
          ))}
        </div>
      </div>
      
      {/* Node Editor Modal */}
      {showNodeEditor && selectedText && (
        <NodeEditor 
          highlightedText={{
            text: selectedText.text,
            verseRef: selectedText.verseRef
          }}
          onClose={handleCloseNodeEditor}
        />
      )}
    </div>
  );
};

export default BibleReader; 