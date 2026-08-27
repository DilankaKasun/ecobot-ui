import React, { useState, useEffect } from 'react';
import { Database, ScanSearch } from 'lucide-react';

const PLANT_DB: Record<string, string> = {
  'AGLAONEMA': 'Specimen identified as Aglaonema (Chinese Evergreen). Tropical perennial native to New Guinea and Asia. Low light tolerance detected. Optimal humidity: 60-70%. Vital signs stable. Chlorophyll density within expected parameters. Analyzing leaf structural integrity... No pathogens detected. Status: HEALTHY.',
  'MONSTERA': 'Specimen identified as Monstera deliciosa. Tropical climbing evergreen. Optimal humidity: 60-80%. Vital signs stable. Fenestrations indicate healthy maturation. Chlorophyll density optimal. No visible pests detected. Status: HEALTHY.',
  'POTHOS': 'Specimen identified as Epipremnum aureum (Pothos). Trailing vine. Highly adaptable. Soil moisture currently adequate. Photosynthetic rate normal. Status: VIGOROUS GROWTH.',
  'ZZ': 'Specimen identified as Zamioculcas zamiifolia (ZZ Plant). Drought tolerant. Rhizome health optimal. Leaf turgor pressure normal. Status: HEALTHY.',
  'SNAKE': 'Specimen identified as Sansevieria trifasciata (Snake Plant). CAM photosynthesis active. Water retention optimal. Status: HEALTHY.',
  'UNKNOWN': 'Specimen classification pending. Analyzing morphological traits... Chlorophyll signature detected. Conducting further spectral analysis to determine taxonomy. Awaiting database cross-reference.'
};

export const BotanicalDescription = ({ label }: { label: string }) => {
  const [displayText, setDisplayText] = useState('');
  const [isTyping, setIsTyping] = useState(true);
  
  useEffect(() => {
    // Determine full text
    let fullText = PLANT_DB['UNKNOWN'];
    const searchLabel = label.toUpperCase();
    for (const key in PLANT_DB) {
      if (searchLabel.includes(key)) {
        fullText = PLANT_DB[key];
        break;
      }
    }

    // Special fallback if no specific match but it's a known plant
    if (fullText === PLANT_DB['UNKNOWN'] && searchLabel !== 'UNKNOWN PLANT') {
      fullText = `Specimen identified as ${label}. Retrieving botanical data... Spectral analysis confirms healthy chlorophyll signatures. Environmental parameters match expected tolerances. Status: OPTIMAL.`;
    }

    setDisplayText('');
    setIsTyping(true);
    let i = 0;
    
    // Randomize typing speed slightly for realism
    const typeNext = () => {
      setDisplayText(fullText.slice(0, i));
      i++;
      if (i > fullText.length) {
        setIsTyping(false);
      } else {
        setTimeout(typeNext, Math.random() * 20 + 20); // 20-40ms per char
      }
    };
    
    const timeout = setTimeout(typeNext, 200); // Initial delay
    
    return () => clearTimeout(timeout);
  }, [label]);

  return (
    <div className="font-mono text-green-400 text-sm font-bold leading-relaxed flex flex-col gap-3 min-h-[160px]">
      <div className="flex items-center gap-2 mb-1 border-b border-green-400/30 pb-2">
        <ScanSearch className="w-5 h-5 text-green-400 animate-pulse" />
        <span className="text-green-400 font-black tracking-widest uppercase">{label}</span>
      </div>
      
      <p className="flex-1 tracking-wide">
        {displayText}
        {isTyping && <span className="inline-block w-2 h-4 bg-green-400 ml-1 animate-pulse align-middle"></span>}
      </p>

      {!isTyping && (
        <div className="flex items-center gap-2 text-green-400/70 border-t border-green-400/20 pt-2 mt-auto">
          <Database className="w-3 h-3" />
          <span className="text-[9px]">ECOLOGICAL DB LINKED</span>
        </div>
      )}
    </div>
  );
};
