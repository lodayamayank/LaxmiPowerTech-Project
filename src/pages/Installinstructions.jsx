// src/pages/InstallInstructions.jsx
import React from 'react';
import { FaApple, FaAndroid, FaShareAlt } from 'react-icons/fa';

const InstallInstructions = () => {
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-blue-50 p-6">
      <div className="max-w-md mx-auto">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">
          Install LPT Attendance App
        </h1>
        
        {isIOS ? (
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <FaApple className="text-gray-700 mb-4" size={40} />
            <h2 className="text-xl font-bold mb-4">iOS Installation</h2>
            
            <ol className="space-y-4 text-gray-700">
              <li className="flex gap-3">
                <span className="font-bold">1.</span>
                <div>
                  Tap the <FaShareAlt className="inline text-blue-600" /> Share button
                  at the bottom of Safari
                </div>
              </li>
              <li className="flex gap-3">
                <span className="font-bold">2.</span>
                <div>Scroll down and tap "Add to Home Screen"</div>
              </li>
              <li className="flex gap-3">
                <span className="font-bold">3.</span>
                <div>Tap "Add" in the top right</div>
              </li>
              <li className="flex gap-3">
                <span className="font-bold">4.</span>
                <div>The app will appear on your home screen</div>
              </li>
            </ol>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <FaAndroid className="text-green-600 mb-4" size={40} />
            <h2 className="text-xl font-bold mb-4">Android Installation</h2>
            <p className="text-gray-700">
              Look for the install banner or tap the menu and select
              "Install app" or "Add to Home screen"
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default InstallInstructions;