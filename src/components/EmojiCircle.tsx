import { useEffect, useState } from 'react';

interface EmojiCircleProps {
  emojis: string[];
  activeIndex: number;
  transformedPhrases: string[];
  isAnimating: boolean;
  showAllPhrases?: boolean; // Prop to control whether to show all phrases
}

const EmojiCircle = ({ 
  emojis, 
  activeIndex, 
  transformedPhrases, 
  isAnimating,
  showAllPhrases = false  // Default to false for backward compatibility
}: EmojiCircleProps) => {
  const [animationStep, setAnimationStep] = useState(0);
  
  useEffect(() => {
    if (isAnimating && animationStep < emojis.length) {
      const timer = setTimeout(() => {
        setAnimationStep(prev => prev + 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [isAnimating, animationStep, emojis.length]);

  useEffect(() => {
    if (!isAnimating) {
      setAnimationStep(0);
    }
  }, [isAnimating]);

  // Adjust circle radius based on number of emojis
  const getCircleRadius = () => {
    // Start with a base radius
    const baseRadius = 130;
    
    // For more emojis, we might want to increase the radius slightly
    // This is a simple linear scale, but you could use other approaches
    const scaleFactor = Math.min(1.2, 1 + (emojis.length - 6) * 0.03);
    
    return baseRadius * scaleFactor;
  };

  const radius = getCircleRadius();

  return (
    <div className="relative w-80 h-80 mx-auto mt-6 border-4 border-dashed border-gray-300 rounded-full">
      {emojis.map((emoji, i) => {
        // Calculate position on circle
        const angle = (i / emojis.length) * 2 * Math.PI - Math.PI / 2;
        const x = 160 + radius * Math.cos(angle);
        const y = 160 + radius * Math.sin(angle);
        
        const isActive = i === activeIndex || (isAnimating && i < animationStep);
        const isHighlighted = isAnimating && i === animationStep - 1;
        
        // Calculate tooltip position to avoid going off-screen
        // Adjust tooltip position based on emoji position
        const tooltipClass = (() => {
          // Top half of circle - tooltip goes below
          if (y < 160) return "top-12";
          // Bottom half - tooltip goes above
          return "bottom-12";
        })();
        
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: x,
              top: y,
              transform: 'translate(-50%, -50%)',
              fontSize: '2.5rem',
              transition: 'all 0.3s ease',
              filter: isActive ? 'drop-shadow(0 0 8px gold)' : 'none',
              opacity: isActive ? 1 : 0.6,
              scale: isHighlighted ? '1.3' : '1',
            }}
          >
            {emoji}
            {/* Show the phrase if: 
                1. The emoji is highlighted during animation, OR
                2. showAllPhrases is true AND this emoji is active */}
            {(isHighlighted || (showAllPhrases && isActive && i < transformedPhrases.length)) && (
              <div className={`absolute left-1/2 transform -translate-x-1/2 bg-white dark:bg-gray-800 px-2 py-1 rounded-md shadow-md text-sm w-max max-w-40 z-10 ${tooltipClass}`}>
                {/* In practice mode (showAllPhrases), show each transformation.
                    In regular mode, only show the final phrase at the last step */}
                {showAllPhrases || i === emojis.length - 1 ? transformedPhrases[i] : ''}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default EmojiCircle