import React, { useEffect, useState, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

// Import framer-motion with error handling
let motion: any;
try {
  // Dynamic import to prevent build errors if the package is missing
  motion = require('framer-motion').motion;
} catch (error) {
  // Create a placeholder motion object if framer-motion isn't available
  motion = {
    div: (props: any) => <div {...props} />
  };
}

type BackgroundOverlayProps = {
  children: React.ReactNode;
  className?: string;
};

export default function AnimatedBackground({ children, className }: BackgroundOverlayProps) {
  const pathname = usePathname();
  const [currentPage, setCurrentPage] = useState<string>('login');
  const initialRender = useRef(true);
  
  useEffect(() => {
    // Set page type based on pathname
    if (pathname === '/' || pathname === '/login') {
      setCurrentPage('login');
    } else if (pathname === '/login/check') {
      setCurrentPage('login-check');
    } else if (pathname.includes('/years') || pathname.includes('/year')) {
      setCurrentPage('years');
    }
    
    // Animation should play on page changes, but not on initial render
    initialRender.current = false;
  }, [pathname]);

  return (
    <div className={cn("relative min-h-screen overflow-hidden", className)}>
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
      
      {/* Base overlay with subtle animation */}
      {motion ? (
        <motion.div 
          className="fixed top-0 left-0 w-full h-full z-10"
          initial={{ opacity: 0.6 }}
          animate={{ 
            opacity: currentPage === 'login' ? 0.6 : 
                    currentPage === 'login-check' ? 0.65 : 0.7
          }}
          transition={{ duration: 1.2 }}
          style={{ 
            background: `linear-gradient(to bottom right, 
              ${currentPage === 'login' ? 'rgba(26, 115, 164, 0.75)' : 
                currentPage === 'login-check' ? 'rgba(26, 115, 164, 0.75)' : 
                'rgba(33, 92, 126, 0.75)'},
              ${currentPage === 'login' ? 'rgba(41, 128, 185, 0.65)' : 
                currentPage === 'login-check' ? 'rgba(41, 128, 185, 0.65)' : 
                'rgba(52, 152, 219, 0.65)'})`
          }}
        />
      ) : (
        <div 
          className="fixed top-0 left-0 w-full h-full z-10"
          style={{ 
            opacity: currentPage === 'login' ? 0.6 : 
                    currentPage === 'login-check' ? 0.65 : 0.7,
            background: `linear-gradient(to bottom right, 
              ${currentPage === 'login' ? 'rgba(26, 115, 164, 0.75)' : 
                currentPage === 'login-check' ? 'rgba(80, 139, 173, 0.75)' : 
                'rgba(33, 92, 126, 0.75)'},
              ${currentPage === 'login' ? 'rgba(41, 128, 185, 0.65)' : 
                currentPage === 'login-check' ? 'rgba(93, 173, 226, 0.65)' : 
                'rgba(52, 152, 219, 0.65)'})`
          }}
        />
      )}
      
      {/* Animated morphing blobs */}
      <div className="fixed top-0 left-0 w-full h-full z-10 overflow-hidden">
        {/* Upper left blob */}
        {motion ? (
          <motion.div 
            className="absolute rounded-full blur-3xl opacity-60"
            initial={{ 
              width: '30vw', 
              height: '30vw', 
              x: '-10vw', 
              y: '20vh', 
              backgroundColor: 'rgba(52, 152, 219, 0.3)' 
            }}
            animate={{ 
              width: currentPage === 'login' ? '35vw' : '40vw', 
              height: currentPage === 'login' ? '35vw' : '40vw',
              x: currentPage === 'login' ? '-5vw' : 
                 currentPage === 'login-check' ? '5vw' : '-15vw',
              y: currentPage === 'login' ? '15vh' : 
                 currentPage === 'login-check' ? '20vh' : '25vh',
              backgroundColor: currentPage === 'login' ? 'rgba(52, 152, 219, 0.25)' : 
                              currentPage === 'login-check' ? 'rgba(93, 173, 226, 0.3)' : 
                              'rgba(41, 128, 185, 0.35)'
            }}
            transition={{ duration: 2.5, ease: 'easeInOut' }}
          />
        ) : (
          <div 
            className="absolute rounded-full blur-3xl opacity-60"
            style={{ 
              width: currentPage === 'login' ? '35vw' : '40vw', 
              height: currentPage === 'login' ? '35vw' : '40vw',
              left: currentPage === 'login' ? '-5vw' : 
                   currentPage === 'login-check' ? '5vw' : '-15vw',
              top: currentPage === 'login' ? '15vh' : 
                  currentPage === 'login-check' ? '20vh' : '25vh',
              backgroundColor: currentPage === 'login' ? 'rgba(52, 152, 219, 0.25)' : 
                              currentPage === 'login-check' ? 'rgba(93, 173, 226, 0.3)' : 
                              'rgba(41, 128, 185, 0.35)'
            }}
          />
        )}
        
        {/* Bottom right blob */}
        {motion ? (
          <motion.div 
            className="absolute rounded-full blur-3xl opacity-60"
            initial={{ 
              width: '40vw', 
              height: '40vw', 
              right: '-5vw', 
              bottom: '10vh', 
              backgroundColor: 'rgba(26, 115, 164, 0.3)' 
            }}
            animate={{ 
              width: currentPage === 'login' ? '45vw' : '50vw', 
              height: currentPage === 'login' ? '45vw' : '50vw',
              right: currentPage === 'login' ? '-10vw' : 
                    currentPage === 'login-check' ? '0vw' : '-5vw',
              bottom: currentPage === 'login' ? '5vh' : 
                     currentPage === 'login-check' ? '0vh' : '10vh',
              backgroundColor: currentPage === 'login' ? 'rgba(26, 115, 164, 0.25)' : 
                              currentPage === 'login-check' ? 'rgba(41, 128, 185, 0.3)' : 
                              'rgba(33, 92, 126, 0.35)'
            }}
            transition={{ duration: 2.5, ease: 'easeInOut', delay: 0.2 }}
          />
        ) : (
          <div 
            className="absolute rounded-full blur-3xl opacity-60"
            style={{ 
              width: currentPage === 'login' ? '45vw' : '50vw', 
              height: currentPage === 'login' ? '45vw' : '50vw',
              right: currentPage === 'login' ? '-10vw' : 
                    currentPage === 'login-check' ? '0vw' : '-5vw',
              bottom: currentPage === 'login' ? '5vh' : 
                     currentPage === 'login-check' ? '0vh' : '10vh',
              backgroundColor: currentPage === 'login' ? 'rgba(26, 115, 164, 0.25)' : 
                              currentPage === 'login-check' ? 'rgba(41, 128, 185, 0.3)' : 
                              'rgba(33, 92, 126, 0.35)'
            }}
          />
        )}
        
        {/* Top center blob - different on each page */}
        {motion ? (
          <motion.div 
            className="absolute rounded-full blur-3xl opacity-50"
            initial={{ 
              width: '25vw', 
              height: '25vw', 
              x: '40vw', 
              y: '-10vh', 
            }}
            animate={{ 
              width: currentPage === 'login' ? '25vw' : 
                    currentPage === 'login-check' ? '30vw' : '35vw',
              height: currentPage === 'login' ? '25vw' : 
                     currentPage === 'login-check' ? '30vw' : '35vw',
              x: currentPage === 'login' ? '40vw' : 
                 currentPage === 'login-check' ? '35vw' : '30vw',
              y: currentPage === 'login' ? '-10vh' : 
                 currentPage === 'login-check' ? '-5vh' : '-8vh',
              backgroundColor: currentPage === 'login' ? 'rgba(41, 128, 185, 0.2)' : 
                              currentPage === 'login-check' ? 'rgba(52, 152, 219, 0.25)' : 
                              'rgba(26, 115, 164, 0.3)',
            }}
            transition={{ duration: 3, ease: 'easeInOut', delay: 0.4 }}
          />
        ) : (
          <div 
            className="absolute rounded-full blur-3xl opacity-50"
            style={{ 
              width: currentPage === 'login' ? '25vw' : 
                    currentPage === 'login-check' ? '30vw' : '35vw',
              height: currentPage === 'login' ? '25vw' : 
                     currentPage === 'login-check' ? '30vw' : '35vw',
              left: currentPage === 'login' ? '40vw' : 
                   currentPage === 'login-check' ? '35vw' : '30vw',
              top: currentPage === 'login' ? '-10vh' : 
                  currentPage === 'login-check' ? '-5vh' : '-8vh',
              backgroundColor: currentPage === 'login' ? 'rgba(41, 128, 185, 0.2)' : 
                              currentPage === 'login-check' ? 'rgba(52, 152, 219, 0.25)' : 
                              'rgba(26, 115, 164, 0.3)',
            }}
          />
        )}
        {/* Bottom left blob - appears in login-check and years */}
        {motion ? (
          <motion.div 
            className="absolute rounded-full blur-3xl opacity-40"
            initial={{ 
              width: '0vw', 
              height: '0vw', 
              x: '10vw', 
              y: '90vh', 
              backgroundColor: 'rgba(93, 173, 226, 0.2)',
              opacity: 0
            }}
            animate={{ 
              width: currentPage === 'login' ? '0vw' : '35vw',
              height: currentPage === 'login' ? '0vw' : '35vw',
              x: currentPage === 'login' ? '10vw' : 
                 currentPage === 'login-check' ? '10vw' : '15vw',
              y: currentPage === 'login' ? '90vh' : 
                 currentPage === 'login-check' ? '65vh' : '70vh',
              backgroundColor: currentPage === 'login' ? 'rgba(93, 173, 226, 0.2)' : 
                              currentPage === 'login-check' ? 'rgba(52, 152, 219, 0.25)' : 
                              'rgba(41, 128, 185, 0.3)',
              opacity: currentPage === 'login' ? 0 : 1
            }}
            transition={{ duration: 2, ease: 'easeInOut', delay: 0.6 }}
          />
        ) : (
          <div 
            className="absolute rounded-full blur-3xl"
            style={{ 
              width: currentPage === 'login' ? '0vw' : '35vw',
              height: currentPage === 'login' ? '0vw' : '35vw',
              left: currentPage === 'login' ? '10vw' : 
                   currentPage === 'login-check' ? '10vw' : '15vw',
              top: currentPage === 'login' ? '90vh' : 
                  currentPage === 'login-check' ? '65vh' : '70vh',
              backgroundColor: currentPage === 'login' ? 'rgba(93, 173, 226, 0.2)' : 
                              currentPage === 'login-check' ? 'rgba(52, 152, 219, 0.25)' : 
                              'rgba(41, 128, 185, 0.3)',
              opacity: currentPage === 'login' ? 0 : 0.4
            }}
          />
        )}
        
        {/* Center right blob - different on years page */}
        {motion ? (
          <motion.div 
            className="absolute rounded-full blur-3xl opacity-30"
            initial={{ 
              width: '20vw', 
              height: '20vw', 
              right: '15vw', 
              top: '40vh', 
              backgroundColor: 'rgba(26, 115, 164, 0.2)',
              opacity: 0,
            }}
            animate={{ 
              width: currentPage === 'years' ? '30vw' : '0vw',
              height: currentPage === 'years' ? '30vw' : '0vw',
              right: '15vw',
              top: '40vh',
              backgroundColor: 'rgba(26, 115, 164, 0.2)',
              opacity: currentPage === 'years' ? 1 : 0,
            }}
            transition={{ duration: 2.2, ease: 'easeInOut', delay: 0.3 }}
          />
        ) : (
          <div 
            className="absolute rounded-full blur-3xl"
            style={{ 
              width: currentPage === 'years' ? '30vw' : '0vw',
              height: currentPage === 'years' ? '30vw' : '0vw',
              right: '15vw',
              top: '40vh',
              backgroundColor: 'rgba(26, 115, 164, 0.2)',
              opacity: currentPage === 'years' ? 0.3 : 0,
            }}
          />
        )}
      </div>
      
      {/* Content */}
      <div className="relative z-20 min-h-screen">
        {children}
      </div>
    </div>
  );
}
