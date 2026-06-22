/**
 * Hero image section component with Spline 3D robot
 * Includes mouse interaction - robot follows cursor movement
 */

import { useState, Suspense, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import Spline from '@splinetool/react-spline';
import type { Application } from '@splinetool/runtime';
import { Box, Text, Spinner, VStack } from '@/shared/design-system';
import { APP_CONSTANTS } from '@/constants/app';

export const HeroImage: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const useSpline = !!APP_CONSTANTS.SPLINE_ROBOT_SCENE;
  const [splineLoaded, setSplineLoaded] = useState(false);
  const splineRef = useRef<Application | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const mouseMoveHandlerRef = useRef<((e: Event) => void) | null>(null);
  const animationFrameIdRef = useRef<number | null>(null);

  // If no Spline scene is configured, show emoji immediately
  useEffect(() => {
    if (!APP_CONSTANTS.SPLINE_ROBOT_SCENE) {
      setIsLoading(false);
      setHasError(true); // This will trigger emoji fallback
    }
  }, []);

  const handleLoad = (spline: Application) => {
    splineRef.current = spline;
    setIsLoading(false);
    setSplineLoaded(true);
    
    // Set up mouse interaction - try multiple times with delays
    const trySetup = (attempt = 1) => {
      if (attempt > 5) {
        console.warn('⚠️ Failed to set up mouse interaction after 5 attempts');
        return;
      }
      
      const success = setupMouseInteraction(spline);
      if (!success && attempt < 5) {
        setTimeout(() => trySetup(attempt + 1), 300 * attempt);
      }
    };
    
    setTimeout(() => trySetup(), 800);
  };

  const setupMouseInteraction = (spline: Application): boolean => {
    if (!containerRef.current) {
      console.log('❌ Container ref not available');
      return false;
    }

    console.log('🔍 Setting up mouse interaction...');

    // Find the robot object - try to find the main/root object
    let robot: any = null;
    
    try {
      // Method 1: Try to find by common names
      const possibleNames = [
        'Robot', 'Bot', 'Character', 'robot', 'bot', 'character', 
        'Group', 'Scene', 'Object', 'Main', 'Root', 'Mesh', 'bot'
      ];
      
      for (const name of possibleNames) {
        try {
          const obj = spline.findObjectByName(name);
          if (obj) {
            console.log(`✅ Found object by name: ${name}`);
            robot = obj;
            break;
          }
        } catch (e) {
          // Continue
        }
      }
      
      // Method 2: Get all objects and find the largest/most complex one
      if (!robot) {
        try {
          const allObjects = spline.getAllObjects();
          console.log(`📦 Found ${allObjects.length} objects in scene`);
          
          // Log first few objects for debugging
          allObjects.slice(0, 5).forEach((obj: any, index: number) => {
            console.log(`  Object ${index}:`, obj.name || 'unnamed', 'has rotation:', 'rotation' in obj);
          });
          
          // Try to find object with rotation property
          for (const obj of allObjects) {
            if (obj && obj.rotation !== undefined) {
              console.log('✅ Found object with rotation:', obj.name || 'unnamed');
              robot = obj;
              break;
            }
          }
          
          // If still not found, use the first non-scene object
          if (!robot && allObjects.length > 0) {
            const nonSceneObjects = allObjects.filter((obj: any) => 
              obj.name && !obj.name.toLowerCase().includes('scene') && !obj.name.toLowerCase().includes('camera')
            );
            if (nonSceneObjects.length > 0) {
              robot = nonSceneObjects[0];
              console.log('⚠️ Using first non-scene object:', robot.name || 'unnamed');
            } else {
              robot = allObjects[0];
              console.log('⚠️ Using first object:', robot.name || 'unnamed');
            }
          }
        } catch (e) {
          console.error('❌ Error getting objects:', e);
          return false;
        }
      }
    } catch (e) {
      console.error('❌ Error finding robot:', e);
      return false;
    }
    
    if (!robot) {
      console.warn('⚠️ Robot object not found');
      return false;
    }

    console.log('✅ Robot object found:', robot.name || 'unnamed', robot);

    // Get the canvas element
    const canvas = containerRef.current.querySelector('canvas');
    if (!canvas) {
      console.warn('⚠️ Canvas not found');
      return false;
    }

    // Store target rotation values
    let targetRotationY = 0;
    let targetRotationX = 0;
    let currentRotationY = 0;
    let currentRotationX = 0;

    // Smooth rotation update function with lerp
    const updateRotation = () => {
      if (!robot || !spline) {
        if (animationFrameIdRef.current) {
          cancelAnimationFrame(animationFrameIdRef.current);
          animationFrameIdRef.current = null;
        }
        return;
      }
      
      try {
        // Smooth interpolation (lerp)
        const lerpFactor = 0.1;
        currentRotationY += (targetRotationY - currentRotationY) * lerpFactor;
        currentRotationX += (targetRotationX - currentRotationX) * lerpFactor;
        
        // Apply rotation to robot
        if (robot.rotation !== undefined) {
          if (typeof robot.rotation === 'object' && robot.rotation !== null) {
            robot.rotation.y = currentRotationY;
            robot.rotation.x = currentRotationX;
          } else {
            // Try direct assignment
            (robot as any).rotation = {
              x: currentRotationX,
              y: currentRotationY,
              z: 0
            };
          }
        } else {
          // Create rotation if it doesn't exist
          (robot as any).rotation = {
            x: currentRotationX,
            y: currentRotationY,
            z: 0
          };
        }
        
        // Continue animation loop
        animationFrameIdRef.current = requestAnimationFrame(updateRotation);
      } catch (e) {
        console.debug('Could not rotate robot:', e);
        if (animationFrameIdRef.current) {
          cancelAnimationFrame(animationFrameIdRef.current);
          animationFrameIdRef.current = null;
        }
      }
    };

    // Start the animation loop
    updateRotation();

    // Add mouse move listener
    const handleMouseMove = (e: Event) => {
      const mouseEvent = e as MouseEvent;
      if (!containerRef.current || !robot || !spline) return;
      
      const rect = containerRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      
      // Calculate mouse position relative to center (normalized -1 to 1)
      const mouseX = (mouseEvent.clientX - centerX) / (rect.width / 2);
      const mouseY = (mouseEvent.clientY - centerY) / (rect.height / 2);
      
      // Calculate rotation angles (in radians)
      const maxRotation = Math.PI / 3; // 60 degrees max
      targetRotationY = Math.max(-maxRotation, Math.min(maxRotation, mouseX * maxRotation * 0.6));
      targetRotationX = Math.max(-maxRotation, Math.min(maxRotation, -mouseY * maxRotation * 0.4));
    };

    mouseMoveHandlerRef.current = handleMouseMove;
    canvas.addEventListener('mousemove', handleMouseMove);
    
    console.log('✅ Mouse event listener added to canvas');
    return true;
  };

  // Cleanup mouse listener and animation frame
  useEffect(() => {
    return () => {
      if (containerRef.current && mouseMoveHandlerRef.current) {
        const canvas = containerRef.current.querySelector('canvas');
        const targetElement = canvas || containerRef.current;
        targetElement.removeEventListener('mousemove', mouseMoveHandlerRef.current);
      }
      // Cancel any pending animation frames
      if (animationFrameIdRef.current !== null && typeof window !== 'undefined' && window.cancelAnimationFrame) {
        window.cancelAnimationFrame(animationFrameIdRef.current);
        animationFrameIdRef.current = null;
      }
    };
  }, [splineLoaded]);

  const handleError = () => {
    console.warn('Spline 3D robot failed to load');
    setIsLoading(false);
    setHasError(true);
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.8, delay: 0.3 }}
    >
      <Box display="flex" justifyContent="center" alignItems="center" py={{ base: 2, md: 4 }}>
        <motion.div
          animate={{
            y: [0, -20, 0],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        >
          <Box
            width={{ base: '240px', sm: '280px', md: '360px', lg: '400px' }}
            height={{ base: '240px', sm: '280px', md: '360px', lg: '400px' }}
            borderRadius="full"
            bg="rgba(255, 255, 255, 0.1)"
            backdropFilter="blur(10px)"
            display="flex"
            alignItems="center"
            justifyContent="center"
            boxShadow="2xl"
            border="4px solid rgba(255, 255, 255, 0.2)"
            position="relative"
            overflow="hidden"
          >
            {hasError || !useSpline ? (
              // Fallback to emoji if Spline fails to load or is not configured
              <Text fontSize="8xl">🤖</Text>
            ) : (
              <>
                {isLoading && (
                  <Box
                    position="absolute"
                    inset={0}
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                    bg="rgba(0, 0, 0, 0.3)"
                    borderRadius="full"
                    zIndex={1}
                  >
                    <VStack spacing={2}>
                      <Spinner size="lg" color="white" thickness="4px" />
                      <Text fontSize="sm" color="white" opacity={0.8}>
                        Loading 3D Robot...
                      </Text>
                    </VStack>
                  </Box>
                )}
                <Suspense
                  fallback={
                    <Box
                      position="absolute"
                      inset={0}
                      display="flex"
                      alignItems="center"
                      justifyContent="center"
                    >
                      <Spinner size="lg" color="white" />
                    </Box>
                  }
                >
                  {APP_CONSTANTS.SPLINE_ROBOT_SCENE && (
                    <Box
                      ref={containerRef}
                      width="100%"
                      height="100%"
                      position="relative"
                      cursor="pointer"
                      sx={{
                        '& canvas': {
                          borderRadius: '50%',
                        },
                      }}
                    >
                      <Spline
                        scene={APP_CONSTANTS.SPLINE_ROBOT_SCENE}
                        onLoad={handleLoad}
                        onError={handleError}
                        style={{
                          width: '100%',
                          height: '100%',
                        }}
                      />
                    </Box>
                  )}
                </Suspense>
              </>
            )}
          </Box>
        </motion.div>
      </Box>
    </motion.div>
  );
};

