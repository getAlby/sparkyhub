import React from "react";

const WarningBanner: React.FC = () => {
  return (
    <div
      className="text-yellow-400 p-2 w-full mb-4 flex items-center justify-center gap-2 text-xs border border-t-0 border-l-0 border-r-0 bg-glass backdrop-blur-lg rounded-lg shadow-glass"
      role="alert"
    >
      <p className="font-bold">
        For experimental use only.{" "}
        <a
          href="https://github.com/getAlby/sparkyhub?tab=readme-ov-file#sparky-hub"
          target="_blank"
          rel="noopener noreferrer"
          className="text-yellow-400 underline hover:text-yellow-500"
        >
          Learn more
        </a>
      </p>
    </div>
  );
};

export default WarningBanner;
