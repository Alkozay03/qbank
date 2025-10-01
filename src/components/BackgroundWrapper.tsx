"use client";

import React from 'react';
import { usePathname } from 'next/navigation';

export default function BackgroundWrapper() {
  const pathname = usePathname();
  
  // Determine page type based on URL
  const isLoginPage = pathname === '/' || pathname === '/login';
  const isLoginCheckPage = pathname === '/login/check' || pathname === '/login/sent';
  
  return (
    <>
      {/* Fixed background image */}
      <div 
        className="fixed top-0 left-0 w-full h-full bg-cover bg-center bg-no-repeat z-0"
        style={{ backgroundImage: 'url(/backgrounds/misty-blue.webp)' }}
      />
      
      {/* Additional semi-transparent overlay for better contrast */}
      <div 
        className="fixed top-0 left-0 w-full h-full z-5"
        style={{ 
          background: 'rgba(255, 255, 255, 0.15)',
          backdropFilter: 'blur(1px)'
        }}
      />
      
      {/* Base overlay gradient - different for each page */}
      <div 
        className="fixed top-0 left-0 w-full h-full z-10"
        style={{ 
          background: isLoginPage 
            ? 'linear-gradient(to bottom right, rgba(26,115,164,0.75), rgba(41,128,185,0.65))' 
            : isLoginCheckPage 
            ? 'linear-gradient(to bottom right, rgba(26,115,164,0.75), rgba(41,128,185,0.65))'
            : 'linear-gradient(to bottom right, rgba(33,92,126,0.75), rgba(52,152,219,0.65))'
        }}
      />
      
      {/* Animated blobs - different for each page */}
      <div className="fixed top-0 left-0 w-full h-full z-10 overflow-hidden">
        {/* Upper left blob */}
        <div 
          className="blob absolute" 
          style={{
            width: isLoginPage ? '35vw' : isLoginCheckPage ? '40vw' : '45vw',
            height: isLoginPage ? '35vw' : isLoginCheckPage ? '40vw' : '45vw',
            left: isLoginPage ? '-5vw' : isLoginCheckPage ? '5vw' : '-15vw',
            top: isLoginPage ? '15vh' : isLoginCheckPage ? '20vh' : '25vh',
            backgroundColor: isLoginPage 
              ? 'rgba(52,152,219,0.25)' 
              : isLoginCheckPage 
              ? 'rgba(93,173,226,0.3)' 
              : 'rgba(41,128,185,0.35)',
          }}
        />
        
        {/* Bottom right blob */}
        <div 
          className="blob absolute" 
          style={{
            width: isLoginPage ? '45vw' : isLoginCheckPage ? '50vw' : '50vw',
            height: isLoginPage ? '45vw' : isLoginCheckPage ? '50vw' : '50vw',
            right: isLoginPage ? '-10vw' : isLoginCheckPage ? '0vw' : '-5vw',
            bottom: isLoginPage ? '5vh' : isLoginCheckPage ? '0vh' : '10vh',
            backgroundColor: isLoginPage 
              ? 'rgba(26,115,164,0.25)' 
              : isLoginCheckPage 
              ? 'rgba(41,128,185,0.3)' 
              : 'rgba(33,92,126,0.35)',
          }}
        />
        
        {/* Center blob - different for each page */}
        <div 
          className="blob absolute"
          style={{
            width: isLoginPage ? '25vw' : isLoginCheckPage ? '30vw' : '35vw',
            height: isLoginPage ? '25vw' : isLoginCheckPage ? '30vw' : '35vw',
            left: isLoginPage ? '40vw' : isLoginCheckPage ? '35vw' : '30vw',
            top: isLoginPage ? '-10vh' : isLoginCheckPage ? '-5vh' : '-8vh',
            backgroundColor: isLoginPage 
              ? 'rgba(41,128,185,0.2)' 
              : isLoginCheckPage 
              ? 'rgba(52,152,219,0.25)' 
              : 'rgba(26,115,164,0.3)',
          }}
        />
      </div>
    </>
  );
}
