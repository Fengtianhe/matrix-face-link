import React, { useEffect, useRef, useState, useCallback } from 'react';
import Webcam from 'react-webcam';
import { analyzeFace } from '../services/geminiService';
import { AnalysisStatus, ThemeMode, GenderMode } from '../types';

interface MatrixFaceProps {
  onLog: (message: string, type?: 'info' | 'success' | 'warning' | 'error' | 'analysis') => void;
  isAnalyzing: boolean;
  setAnalysisStatus: (status: AnalysisStatus) => void;
  theme: ThemeMode;
  gender: GenderMode;
}

// Global declarations for MediaPipe loaded via script tags
declare global {
  interface Window {
    FaceMesh: any;
    Camera: any;
    drawConnectors: any;
    FACEMESH_TESSELATION: any;
    FACEMESH_RIGHT_EYE: any;
    FACEMESH_LEFT_EYE: any;
    FACEMESH_RIGHT_EYEBROW: any;
    FACEMESH_LEFT_EYEBROW: any;
    FACEMESH_LIPS: any;
  }
}

// Theme Configuration
const THEMES = {
    MATRIX: {
        bg: '#010202',
        primary: '#00ffcc', // Bright Cyan/Green
        secondary: 'rgba(0, 255, 200, 0.6)',
        dim: 'rgba(0, 50, 40, 0.05)',
        glitch1: '#ff0055',
        glitch2: '#00ffcc'
    },
    CYBER_PUNK: {
        bg: '#050005',
        primary: '#f0f', // Magenta
        secondary: 'rgba(0, 200, 255, 0.8)', // Cyan lines
        dim: 'rgba(50, 0, 50, 0.05)',
        glitch1: '#00ffff',
        glitch2: '#ffff00'
    },
    GOLDEN_DATA: {
        bg: '#050200',
        primary: '#ffcc00', // Gold
        secondary: 'rgba(255, 150, 0, 0.6)', // Orange
        dim: 'rgba(50, 20, 0, 0.05)',
        glitch1: '#ffffff',
        glitch2: '#ff0000'
    }
};

const MatrixFace: React.FC<MatrixFaceProps> = ({ onLog, isAnalyzing, setAnalysisStatus, theme, gender }) => {
  const webcamRef = useRef<Webcam>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const faceMeshRef = useRef<any>(null);
  
  // Refs for Glitch/Motion FX
  const prevNoseRef = useRef<{x: number, y: number} | null>(null);
  const glitchFrameRef = useRef<number>(0);

  // Refs for Audio FX
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioDataRef = useRef<Uint8Array | null>(null);

  // Initialize Audio
  useEffect(() => {
      const initAudio = async () => {
          try {
              const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
              const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
              const analyser = audioCtx.createAnalyser();
              
              analyser.fftSize = 256; // Smaller size for faster processing
              analyser.smoothingTimeConstant = 0.5; // Smooth out the jitter
              
              const source = audioCtx.createMediaStreamSource(stream);
              source.connect(analyser);
              
              audioContextRef.current = audioCtx;
              analyserRef.current = analyser;
              audioDataRef.current = new Uint8Array(analyser.frequencyBinCount);
              
              onLog("声波共振模块已激活。", "success");
          } catch (err) {
              onLog("无法访问麦克风，声波反馈已禁用。", "warning");
          }
      };

      // Delay slightly to ensure user interaction (browsers block audio ctx otherwise sometimes, though getUserMedia usually handles permission)
      initAudio();

      return () => {
          if (audioContextRef.current) {
              audioContextRef.current.close();
          }
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Initialize MediaPipe FaceMesh
  useEffect(() => {
    onLog("正在初始化神经接口...", "info");
    
    // Check if libraries loaded
    if (!window.FaceMesh || !window.Camera || !window.drawConnectors) {
        onLog("MediaPipe 库加载失败，请检查网络连接。", "error");
        return;
    }

    const faceMesh = new window.FaceMesh({
      locateFile: (file: string) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`;
      },
    });

    faceMesh.setOptions({
      maxNumFaces: 1,
      refineLandmarks: true,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });

    faceMesh.onResults(onResults);
    faceMeshRef.current = faceMesh;

    onLog("神经接口初始化完成。", "success");
    
    // Initialize Camera
    if (webcamRef.current && webcamRef.current.video) {
        const camera = new window.Camera(webcamRef.current.video, {
        onFrame: async () => {
            if (webcamRef.current && webcamRef.current.video && faceMeshRef.current) {
            await faceMeshRef.current.send({ image: webcamRef.current.video });
            }
        },
        width: 1280,
        height: 720,
        });
        
        camera.start()
        .then(() => {
            setCameraReady(true);
            onLog("视觉传感器已连接。", "success");
            onLog("开始捕捉生物特征数据...", "info");
        })
        .catch((err: any) => {
            onLog(`摄像头访问失败: ${err}`, "error");
        });
    }

    return () => {
        // Cleanup if needed
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onResults = useCallback((results: any) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const currentTheme = THEMES[theme];
    const { width, height } = canvas;
    
    // --- AUDIO PROCESSING ---
    let audioLevel = 0;
    if (analyserRef.current && audioDataRef.current) {
        // @ts-ignore
        analyserRef.current.getByteFrequencyData(audioDataRef.current);
        // Calculate average volume
        let sum = 0;
        const data = audioDataRef.current;
        for (let i = 0; i < data.length; i++) {
            sum += data[i];
        }
        audioLevel = sum / data.length; // 0 to 255 usually
        // Normalize roughly to 0.0 - 1.0 range (with noise gate)
        audioLevel = Math.max(0, audioLevel - 10) / 100; 
    }

    // Check for mouth open (Warning Trigger)
    let isWarning = false;
    if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
        const lm = results.multiFaceLandmarks[0];
        // 13: Upper lip, 14: Lower lip, 10: Top Head, 152: Chin
        const mouthH = Math.hypot(lm[13].x - lm[14].x, lm[13].y - lm[14].y);
        const faceH = Math.hypot(lm[10].x - lm[152].x, lm[10].y - lm[152].y);
        
        // Threshold for opening mouth
        if (faceH > 0 && (mouthH / faceH) > 0.1) {
            isWarning = true;
        }
    }

    // --- FX 1: MOTION TRAILS ---
    // Dynamic fade based on audio level (louder = longer trails)
    const fadeAlpha = isWarning ? 0.3 : Math.max(0.1, 0.25 - audioLevel * 0.1);
    
    if (isWarning) {
        ctx.fillStyle = "rgba(20, 0, 0, 0.3)";
    } else {
        // Hex to RGBA manual for variable alpha
        ctx.fillStyle = `${currentTheme.bg}${Math.floor(fadeAlpha * 255).toString(16).padStart(2,'0')}`;
    }
    ctx.fillRect(0, 0, width, height);

    let isGlitch = false;
    let jitterX = 0;
    let jitterY = 0;

    // --- FX 2: GLITCH LOGIC ---
    if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
        const landmarks = results.multiFaceLandmarks[0];
        const nose = landmarks[1]; // Nose tip

        // Calculate velocity based on nose movement
        if (prevNoseRef.current) {
            const dx = nose.x - prevNoseRef.current.x;
            const dy = nose.y - prevNoseRef.current.y;
            const velocity = Math.sqrt(dx*dx + dy*dy);

            if (velocity > 0.04) {
                glitchFrameRef.current = 4;
            }
        }
        prevNoseRef.current = { x: nose.x, y: nose.y };

        // Random glitch or AUDIO SPIKE glitch
        if (Math.random() < 0.005 || audioLevel > 1.2) {
            glitchFrameRef.current = Math.floor(Math.random() * 5) + 3;
        }

        if (glitchFrameRef.current > 0) {
            isGlitch = true;
            glitchFrameRef.current--;
            jitterX = (Math.random() - 0.5) * 40; 
            jitterY = (Math.random() - 0.5) * 8; 
        }
    }

    ctx.save();
    
    // Background Lines
    if (isWarning) {
        ctx.fillStyle = "rgba(255, 0, 0, 0.1)";
        for (let i = 0; i < height; i += 8) {
             if (i % 16 === 0) ctx.fillRect(0, i, width, 2);
        }
    } else if (isGlitch) {
        ctx.fillStyle = `${currentTheme.primary}15`;
        ctx.fillRect(0, 0, width, height);
    } else {
        // Background pulses with audio
        const bgAlpha = 0.05 + (audioLevel * 0.1); 
        ctx.fillStyle = currentTheme.dim.replace(/[\d.]+\)$/, `${bgAlpha})`);
        
        // Draw Audio Visualizer bars in background
        if (audioDataRef.current) {
            const barWidth = width / 32;
            for(let i=0; i<32; i++) {
                const barHeight = (audioDataRef.current[i*2] / 255) * height * 0.5;
                ctx.fillRect(i * barWidth, height - barHeight, barWidth - 2, barHeight);
            }
        } else {
            for (let i = 0; i < height; i += 4) {
                ctx.fillRect(0, i, width, 1);
            }
        }
    }

    if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
      const originalLandmarks = results.multiFaceLandmarks[0];
      let landmarks = originalLandmarks.map((p: any) => ({...p}));
      
      // --- STABILIZATION & CENTERING ---
      let minX = 1, minY = 1, maxX = 0, maxY = 0;
      let sumX = 0, sumY = 0;
      
      landmarks.forEach((p: any) => {
        if(p.x < minX) minX = p.x;
        if(p.x > maxX) maxX = p.x;
        if(p.y < minY) minY = p.y;
        if(p.y > maxY) maxY = p.y;
        sumX += p.x;
        sumY += p.y;
      });

      const centerX = sumX / landmarks.length;
      const centerY = sumY / landmarks.length;

      // --- MORPHING & AUDIO DEFORMATION ---
      const noseY = landmarks[1].y;
      landmarks = landmarks.map((p: any) => {
          let newP = {...p};

          // 1. Gender Morph
          if (gender !== 'NEUTRAL') {
              if (p.y >= noseY) {
                  const distFromCenter = p.x - centerX;
                  if (gender === 'FEMALE') {
                      const factor = (p.y - noseY) * 1.5; 
                      if (factor > 0) newP.x = centerX + distFromCenter * (1 - factor * 0.3);
                  } else if (gender === 'MALE') {
                      const factor = (p.y - noseY) * 1.2;
                      if (factor > 0) newP.x = centerX + distFromCenter * (1 + factor * 0.2);
                  }
              }
          }

          // 2. Audio Vibration
          // High audio = noise on vertices
          if (audioLevel > 0.05) {
              const noiseX = (Math.random() - 0.5) * 0.01 * audioLevel; // 1% screen width jitter max
              const noiseY = (Math.random() - 0.5) * 0.01 * audioLevel;
              newP.x += noiseX;
              newP.y += noiseY;
          }

          // 3. Warning Distortion
          if (isWarning) {
             newP.x += (Math.random() - 0.5) * 0.02;
             newP.y += (Math.random() - 0.5) * 0.02;
          }

          return newP;
      });
      
      const faceHeight = maxY - minY;
      const desiredFaceHeight = 0.55; 
      
      // Audio Scale: Talk louder -> Face gets slightly larger
      const audioScale = 1.0 + (audioLevel * 0.1); 
      
      const scale = (desiredFaceHeight / Math.max(0.1, faceHeight)) * audioScale;
      
      let stretchX = 0.85; 
      let stretchY = 1.35; 

      if (gender === 'MALE') { stretchX = 0.95; stretchY = 1.25; } 
      else if (gender === 'FEMALE') { stretchX = 0.82; stretchY = 1.30; }

      // --- RENDER FUNCTION ---
      const renderFaceMesh = (colorPrimary: string, colorSecondary: string, offsetX: number, offsetY: number) => {
          ctx.save();
          // Transform
          ctx.translate(width/2 + offsetX, height/2 + offsetY);
          ctx.scale(scale * stretchX, scale * stretchY);
          ctx.translate(-centerX * width, -centerY * height);

          // 1. Wireframe
          if (window.drawConnectors) {
              // Audio brightness boost
              const brightnessBoost = Math.min(1, audioLevel * 0.5); 
              
              if (window.FACEMESH_TESSELATION) {
                  ctx.globalAlpha = 0.2 + brightnessBoost * 0.3; // Brighter mesh when loud
                  window.drawConnectors(ctx, landmarks, window.FACEMESH_TESSELATION, {
                      color: colorPrimary, 
                      lineWidth: 0.5 + brightnessBoost // Thicker lines when loud
                  });
                  ctx.globalAlpha = 1.0;
              }

              const featureStyle = { color: colorPrimary, lineWidth: 0.8 + brightnessBoost };
              if (window.FACEMESH_RIGHT_EYEBROW) window.drawConnectors(ctx, landmarks, window.FACEMESH_RIGHT_EYEBROW, featureStyle);
              if (window.FACEMESH_LEFT_EYEBROW) window.drawConnectors(ctx, landmarks, window.FACEMESH_LEFT_EYEBROW, featureStyle);
              if (window.FACEMESH_RIGHT_EYE) window.drawConnectors(ctx, landmarks, window.FACEMESH_RIGHT_EYE, featureStyle);
              if (window.FACEMESH_LEFT_EYE) window.drawConnectors(ctx, landmarks, window.FACEMESH_LEFT_EYE, featureStyle);
              if (window.FACEMESH_LIPS) window.drawConnectors(ctx, landmarks, window.FACEMESH_LIPS, featureStyle);
          }

          // 2. Particles
          landmarks.forEach((point: {x: number, y: number, z: number}, index: number) => {
                const x = point.x * width;
                const y = point.y * height;
                
                const isFeatures = [1, 33, 133, 362, 263, 61, 291, 10, 152].includes(index);
                const isContour = index % 10 === 0 || (index === 234 || index === 454 || index === 58 || index === 288);

                if (isFeatures) {
                    ctx.fillStyle = colorPrimary;
                    ctx.beginPath();
                    // Audio sizing for particles
                    const size = 3 + audioLevel * 2;
                    ctx.moveTo(x, y - size);
                    ctx.lineTo(x + size, y);
                    ctx.lineTo(x, y + size);
                    ctx.lineTo(x - size, y);
                    ctx.fill();
                } else if (isContour) {
                    ctx.fillStyle = colorSecondary;
                    ctx.beginPath();
                    const size = 1.5 + audioLevel;
                    ctx.moveTo(x, y - size);
                    ctx.lineTo(x + size, y);
                    ctx.lineTo(x, y + size);
                    ctx.lineTo(x - size, y);
                    ctx.fill();
                } else {
                    if (index % 3 === 0) {
                        ctx.fillStyle = colorSecondary;
                        ctx.globalAlpha = 0.4 + (audioLevel * 0.4); // Particles flicker with audio
                        ctx.fillRect(x - 0.5, y - 0.5, 1, 1);
                        ctx.globalAlpha = 1.0;
                    }
                }
          });
          
          // Brackets (UI)
          const pad = 0.08 * width;
          const lx = (minX * width) - pad;
          const ly = (minY * height) - pad;
          const lw = (maxX - minX) * width + pad*2;
          const lh = (maxY - minY) * height + pad*2;
          
          ctx.strokeStyle = colorSecondary;
          ctx.lineWidth = 1.0 / (scale * stretchX); 
          const lineL = 30 / (scale * stretchY);
          
          // Audio reacts bracket
          if (audioLevel > 0.5) {
              ctx.shadowColor = colorPrimary;
              ctx.shadowBlur = 10;
          }

          ctx.beginPath(); ctx.moveTo(lx, ly + lineL); ctx.lineTo(lx, ly); ctx.lineTo(lx + lineL, ly); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(lx + lw - lineL, ly); ctx.lineTo(lx + lw, ly); ctx.lineTo(lx + lw, ly + lineL); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(lx + lw, ly + lh - lineL); ctx.lineTo(lx + lw, ly + lh); ctx.lineTo(lx + lw - lineL, ly + lh); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(lx + lineL, ly + lh); ctx.lineTo(lx, ly + lh); ctx.lineTo(lx, ly + lh - lineL); ctx.stroke();
          
          ctx.shadowBlur = 0;
          ctx.restore();
      };

      // --- EXECUTE RENDER ---
      const activePrimary = isWarning ? '#ff1a1a' : currentTheme.primary;
      const activeSecondary = isWarning ? 'rgba(255, 20, 20, 0.8)' : currentTheme.secondary;
      const activeGlitch = isWarning ? '#ffffff' : currentTheme.glitch1;

      if (isGlitch || isWarning) {
          ctx.globalCompositeOperation = 'screen'; 
          renderFaceMesh(activeGlitch, activeSecondary, jitterX, jitterY); 
          renderFaceMesh(activePrimary, activeSecondary, 0, 0); 
          ctx.globalCompositeOperation = 'source-over'; 
      } else {
          renderFaceMesh(activePrimary, activeSecondary, 0, 0);
      }
      
      // --- WARNING HUD OVERLAY ---
      if (isWarning) {
          ctx.save();
          ctx.fillStyle = "rgba(255, 0, 0, 0.8)";
          ctx.shadowColor = "red";
          ctx.shadowBlur = 20;
          ctx.textAlign = "center";
          
          if (Math.floor(Date.now() / 100) % 2 === 0) {
              ctx.font = "bold 32px 'Share Tech Mono'";
              ctx.fillText("⚠ WARNING: BIO-SIGNATURE UNSTABLE ⚠", width/2, height * 0.2);
          }
          
          ctx.font = "16px 'Share Tech Mono'";
          ctx.fillStyle = "rgba(255, 100, 100, 0.9)";
          ctx.fillText("DETECTED ABNORMAL JAW ARTIFACT", width/2, height * 0.2 + 30);
          
          ctx.strokeStyle = "rgba(255,0,0,0.5)";
          ctx.lineWidth = 2;
          const time = Date.now() / 200;
          const radius = 100 + Math.sin(time) * 20;
          ctx.beginPath();
          ctx.arc(width/2, height/2, radius, 0, Math.PI * 2);
          ctx.stroke();
          
          ctx.restore();
      }

    } else {
        // Scanning State
        ctx.fillStyle = `${currentTheme.bg}cc`;
        ctx.strokeStyle = currentTheme.primary;
        ctx.lineWidth = 2;
        
        const time = Date.now() / 1000;
        const scanY = (Math.sin(time) * 0.5 + 0.5) * height;
        
        ctx.beginPath();
        ctx.moveTo(0, scanY);
        ctx.lineTo(width, scanY);
        ctx.stroke();
        
        ctx.font = "16px 'Share Tech Mono'";
        ctx.fillStyle = currentTheme.primary;
        ctx.textAlign = "center";
        ctx.fillText("ACQUIRING_TARGET...", width/2, scanY - 10);

        // Draw audio visualization even in idle mode if audio exists
        if (analyserRef.current && audioDataRef.current && audioLevel > 0.1) {
             const barWidth = width / 64;
             ctx.fillStyle = currentTheme.primary;
             for(let i=0; i<64; i++) {
                const h = (audioDataRef.current[i] / 255) * 100;
                ctx.fillRect(i * barWidth, height - h, barWidth-1, h);
             }
        }
    }

    ctx.restore();
  }, [theme, gender]); // Added theme and gender to dependency array

  // Trigger Local Analysis
  const triggerAnalysis = useCallback(async () => {
    if (isAnalyzing || !webcamRef.current) return;
    
    setAnalysisStatus(AnalysisStatus.CAPTURING);
    onLog("捕获关键帧进行深度分析...", "info");
    
    const imageSrc = webcamRef.current.getScreenshot();
    if (!imageSrc) {
        onLog("帧捕获失败。", "error");
        setAnalysisStatus(AnalysisStatus.IDLE);
        return;
    }

    setAnalysisStatus(AnalysisStatus.ANALYZING);
    onLog("正在进行本地神经元分析...", "info");

    try {
        const analysisResult = await analyzeFace(imageSrc);
        onLog(analysisResult, "analysis");
        setAnalysisStatus(AnalysisStatus.COMPLETE);
    } catch (error) {
        onLog("分析进程中断。", "error");
        setAnalysisStatus(AnalysisStatus.ERROR);
    } finally {
        setTimeout(() => setAnalysisStatus(AnalysisStatus.IDLE), 2000);
    }
  }, [isAnalyzing, onLog, setAnalysisStatus]);

  // Auto-analyze every 8 seconds if camera is ready
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (cameraReady) {
        interval = setInterval(() => {
            triggerAnalysis();
        }, 8000);
    }
    return () => clearInterval(interval);
  }, [cameraReady, triggerAnalysis]);


  return (
    <div className="relative w-full h-full flex items-center justify-center bg-black overflow-hidden border-2 rounded-xl transition-colors duration-500"
         style={{ borderColor: THEMES[theme].secondary }}
    >
        {/* Hidden Webcam Source */}
        <Webcam
            ref={webcamRef}
            audio={false}
            width={1280}
            height={720}
            screenshotFormat="image/jpeg"
            className="absolute opacity-0 pointer-events-none"
            videoConstraints={{ facingMode: "user" }}
        />
        
        {/* Particle Canvas */}
        <canvas
            ref={canvasRef}
            width={1280}
            height={720}
            className="w-full h-full object-cover transform -scale-x-100"
        />

        {!cameraReady && (
            <div className="absolute inset-0 flex items-center justify-center font-mono animate-pulse"
                 style={{ color: THEMES[theme].primary }}
            >
                [ 初始化传感器... ]
            </div>
        )}

        {/* Overlay HUD Elements */}
        <div className="absolute top-4 left-4 text-xs font-mono opacity-70 pointer-events-none"
             style={{ color: THEMES[theme].primary }}
        >
            <div>CAM_FEED: LOCKED</div>
            <div>MODE: {theme} // {gender}</div>
            <div>AUDIO_SENSOR: ACTIVE</div>
            <div>TRACKING_HZ: 60</div>
        </div>

        {/* Manual Trigger Button */}
        <button 
            onClick={triggerAnalysis}
            disabled={!cameraReady || isAnalyzing}
            className="absolute bottom-6 right-6 px-6 py-2 bg-opacity-20 border transition-all font-mono text-sm uppercase tracking-widest disabled:opacity-30 disabled:cursor-not-allowed z-30 shadow-[0_0_10px_rgba(255,255,255,0.1)]"
            style={{ 
                backgroundColor: `${THEMES[theme].secondary}33`,
                borderColor: THEMES[theme].primary,
                color: THEMES[theme].primary
            }}
        >
            {isAnalyzing ? "正在分析..." : "手动扫描"}
        </button>
    </div>
  );
};

export default MatrixFace;