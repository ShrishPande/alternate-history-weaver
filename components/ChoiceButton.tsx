
import React from 'react';

interface ChoiceButtonProps {
  onClick: () => void;
  disabled: boolean;
  children: React.ReactNode;
}

const ChoiceButton: React.FC<ChoiceButtonProps> = ({ onClick, disabled, children }) => {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="w-full text-left bg-gray-700 hover:bg-cyan-600/50 text-white font-semibold py-4 px-6 rounded-lg shadow-md transform hover:-translate-y-1 transition-all duration-300 ease-in-out disabled:bg-gray-800 disabled:cursor-not-allowed disabled:transform-none disabled:text-gray-500 border border-gray-600 focus:outline-none focus:ring-2 focus:ring-cyan-500"
    >
      {children}
    </button>
  );
};

export default ChoiceButton;
