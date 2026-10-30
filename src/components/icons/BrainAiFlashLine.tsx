import React from 'react';

interface IconProps extends React.SVGProps<SVGSVGElement> {
  className?: string;
}

export const BrainAiFlashLine: React.FC<IconProps> = ({ className = 'w-5 h-5 text-amber-400', ...props }) => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
    aria-hidden="true"
    {...props}
  >
    <path d="M12 2a5 5 0 0 1 4.9 4.004A4.5 4.5 0 0 1 20 10.5a4.49 4.49 0 0 1-1.576 3.414A4.5 4.5 0 0 1 14 18v2a1 1 0 0 1-1 1h-2a1 1 0 0 1-1-1v-2a4.5 4.5 0 0 1-4.424-4.086A4.5 4.5 0 0 1 4 10.5 4.5 4.5 0 0 1 7.1 6.004 5 5 0 0 1 12 2zm1 14.938A4.502 4.502 0 0 1 12 17a4.5 4.5 0 0 1-1-.112V19h2v-2.062zM12 4a3 3 0 0 0-2.995 2.824L9 7v.5a1 1 0 0 1-1 1A2.5 2.5 0 0 0 5.5 11c0 1.28.96 2.336 2.2 2.483a1 1 0 0 1 .8.995A2.5 2.5 0 0 0 11 17h2a2.5 2.5 0 0 0 2.5-2.522 1 1 0 0 1 .8-.995 2.5 2.5 0 0 0 2.2-2.483A2.5 2.5 0 0 0 16 8.5a1 1 0 0 1-1-1V7a3 3 0 0 0-3-3zm1 4-2 3.5h2.5L11 15l2-3.5h-2.5L13 8z" />
  </svg>
);

