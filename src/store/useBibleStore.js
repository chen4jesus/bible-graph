import { create } from 'zustand';
import { persist } from 'zustand/middleware';
// Import the original parser
import { parseBibleXML as parseWithXml2js } from '../utils/bibleParser';
// Import the alternative parser
import { parseBibleXML as parseWithDOMParser } from '../utils/bibleParserAlt';

const useBibleStore = create(
  persist(
    (set, get) => ({
      bibleData: null,
      loading: false,
      error: null,
      currentBook: '1', // Default to Genesis
      currentChapter: '1',
      currentVerse: null,
      highlightedText: null,
      
      setBibleData: (data) => set({ bibleData: data }),
      
      loadBibleData: async (xmlContent) => {
        set({ loading: true, error: null });
        try {
          console.log('Starting to parse Bible XML...');
          console.log('XML content length:', xmlContent.length);
          
          let data;
          
          // Try with DOMParser first (browser-native)
          try {
            console.log('Trying to parse with DOMParser...');
            data = await parseWithDOMParser(xmlContent);
          } catch (domError) {
            console.warn('DOMParser failed, trying with xml2js:', domError);
            // Fall back to xml2js if DOMParser fails
            data = await parseWithXml2js(xmlContent);
          }
          
          console.log('Bible parsed successfully, books:', data ? data.length : 0);
          
          if (!data || data.length === 0) {
            throw new Error('No Bible books were parsed');
          }
          
          set({ bibleData: data, loading: false });
          return data;
        } catch (error) {
          console.error('Error parsing Bible XML:', error);
          set({ error: error.message, loading: false });
          return null;
        }
      },
      
      setCurrentLocation: (book, chapter, verse = null) => set({
        currentBook: book,
        currentChapter: chapter,
        currentVerse: verse
      }),
      
      setHighlightedText: (text, verseRef) => set({
        highlightedText: { text, verseRef }
      }),
      
      clearHighlightedText: () => set({
        highlightedText: null
      }),
      
      // Function to get a specific verse by reference (format: "book.chapter.verse")
      getVerseContent: (verseRef) => {
        const bibleData = get().bibleData;
        if (!bibleData) return null;
        
        try {
          const [bookId, chapterNum, verseNum] = verseRef.split('.');
          
          // Find the book
          const book = bibleData.find(b => b.id === bookId);
          if (!book) return null;
          
          // Find the chapter
          const chapter = book.chapters.find(c => c.number === chapterNum);
          if (!chapter) return null;
          
          // Find the verse
          const verse = chapter.verses.find(v => v.number === verseNum);
          if (!verse) return null;
          
          return {
            reference: `${book.name} ${chapterNum}:${verseNum}`,
            text: verse.text,
            fullRef: verseRef
          };
        } catch (error) {
          console.error('Error getting verse content:', error);
          return null;
        }
      }
    }),
    {
      name: 'bible-storage',
      partialize: (state) => ({
        currentBook: state.currentBook,
        currentChapter: state.currentChapter,
        currentVerse: state.currentVerse
      })
    }
  )
);

export default useBibleStore; 