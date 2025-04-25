import React from "react";

const WarningBanner: React.FC = () => {
  return (
    <div
      className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-2 w-full mb-4 flex items-center justify-center gap-2 text-sm"
      role="alert"
    >
      <p className="font-bold">
        For experimental use only.{" "}
        <a
          href="https://github.com/getAlby/sparkyhub?tab=readme-ov-file#sparky-hub"
          target="_blank"
          rel="noopener noreferrer"
          className="text-yellow-700 underline hover:text-yellow-900"
        >
          Learn More
        </a>
      </p>
    </div>
  );
};

export default WarningBanner;
