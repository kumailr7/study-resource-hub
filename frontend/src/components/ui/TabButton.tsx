import React from 'react';

interface TabButtonProps {
  label: string;
  isActive: boolean;
  onClick: () => void;
}

const TabButton: React.FC<TabButtonProps> = ({ label, isActive, onClick }) => {
  return (
    <button
      onClick={onClick}
      className={`py-2 px-4 rounded-lg transition-colors duration-200 ${
        isActive
          ? 'bg-blue-600 text-white font-bold'
          : 'bg-transparent text-blue-600 border border-blue-600'
      }`}
    >
      {label}
    </button>
  );
};

export default TabButton; 