import React, { useState } from "react";

interface AccordionProps {
  title: string;
  content: JSX.Element;
  defaultOpen?: boolean;
}

const Accordion: React.FC<AccordionProps> = ({
  title,
  content,
  defaultOpen,
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen || false);

  return (
    <div className="border-b border-gray-400">
      <div
        className="cursor-pointer p-4 flex justify-between items-center"
        onClick={() => setIsOpen(!isOpen)}
      >
        <h2 className="text-lg text-white font-bold">{title}</h2>
        <span
          className={`text-white transform duration-300 ${
            isOpen ? "rotate-90" : ""
          }`}
        >
          ▼
        </span>
      </div>
      {isOpen && <div className="p-4 bg-gray-700 text-white">{content}</div>}
    </div>
  );
};

export default Accordion;
