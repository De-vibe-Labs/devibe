import React from 'react';

interface LogoProps extends React.SVGProps<SVGSVGElement> {
  size?: number;
  hideText?: boolean;
}

export const DevibeLogoSymbol: React.FC<React.SVGProps<SVGSVGElement>> = (props) => {
  return (
    <svg
      viewBox="0 0 160 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <defs>
        {/* Standard linear gradient matching Devibe color palette */}
        <linearGradient id="devibe-grad" x1="15" y1="15" x2="105" y2="105" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#6E3CFB" />
          <stop offset="50%" stopColor="#2563EB" />
          <stop offset="100%" stopColor="#00D4FF" />
        </linearGradient>
      </defs>

      {/* STYLIZED D SYMBOL BODY */}
      <path
        d="M 32 15 H 62 C 86 15 102 31 102 60 C 102 89 86 105 62 105 H 32 C 22 105 15 97 15 87 V 33 C 15 23 22 15 32 15 Z"
        fill="url(#devibe-grad)"
      />

      {/* COUNTER CUTOUT (Leaf shape / curved eye matching original) */}
      <path
        d="M 40 33 C 40 33 66 40 66 60 C 66 80 40 87 40 87 C 40 87 35 73 35 60 C 35 47 40 33 40 33 Z"
        fill="#0B0F19"
      />

      {/* SHINING 4-POINT SPARK (Centered inside cutout) */}
      <path
        d="M 49 46 C 49 53 49 53 42 53 C 49 53 49 53 49 60 C 49 53 49 53 56 53 C 49 53 49 53 49 46 Z"
        fill="#FFFFFF"
      />

      {/* CIRCUIT LINES (Coming out from the curved outer right boundary) */}
      {/* Top Circuit Path */}
      <path
        d="M 94 44 H 115 L 126 33 H 134"
        stroke="#00D4FF"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Middle Circuit Path */}
      <path
        d="M 102 60 H 134"
        stroke="#00D4FF"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Bottom Circuit Path */}
      <path
        d="M 94 76 H 115 L 126 87 H 134"
        stroke="#00D4FF"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* STYLIZED TERMINAL NODES (Dots at line extremities) */}
      <circle cx="140" cy="33" r="6" fill="#00D4FF" />
      <circle cx="140" cy="60" r="6" fill="#00D4FF" />
      <circle cx="140" cy="87" r="6" fill="#00D4FF" />
    </svg>
  );
};

export const DevibeLogo: React.FC<LogoProps> = ({ size = 40, hideText = false, className, ...svgProps }) => {
  return (
    <div className={`flex items-center gap-3 select-none ${className || ''}`}>
      <DevibeLogoSymbol 
        style={{ width: size, height: (size * 120) / 160 }} 
        className="shrink-0 animate-fade-in" 
        {...svgProps} 
      />
      {!hideText && (
        <div className="flex flex-col text-left">
          <div className="flex items-baseline leading-none">
            <span className="font-display text-xl font-bold text-white tracking-wider uppercase">Devibe</span>
            <span className="w-1.5 h-1.5 rounded-full bg-[#6E3CFB] ml-0.5"></span>
          </div>
          <span className="text-[8px] text-slate-400 font-mono tracking-[0.2em] uppercase mt-0.5 leading-none">
            BUILD • AUTOMATE • DEPLOY
          </span>
        </div>
      )}
    </div>
  );
};
