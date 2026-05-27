import React, { useState, useEffect, useRef } from "react";
import { Camera, RefreshCw, Sparkles, HelpCircle, AlertCircle, Play } from "lucide-react";
import { Html5Qrcode } from "html5-qrcode";
import { PRESET_PRODUCTS } from "../data/mockPresets";
import { motion, AnimatePresence } from "motion/react";

interface BarcodeScannerProps {
  onScanSuccess: (barcode: string) => void;
  onScanError?: (error: string) => void;
  continuousMode: boolean;
  onToggleContinuousMode: (active: boolean) => void;
}

export default function BarcodeScanner({ 
  onScanSuccess, 
  onScanError,
  continuousMode,
  onToggleContinuousMode
}: BarcodeScannerProps) {
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>("");
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [scannerError, setScannerError] = useState<string | null>(null);
  const [simulationMode, setSimulationMode] = useState<boolean>(false);
  const [manualInput, setManualInput] = useState<string>("");
  const [scanFeedbackMsg, setScanFeedbackMsg] = useState<string | null>(null);

  const qrCodeInstanceRef = useRef<Html5Qrcode | null>(null);
  const lastScannedRef = useRef<{ code: string; timestamp: number } | null>(null);
  const scannerId = "erp-live-scanner-viewport";

  // Trigger synthetic beep sound using browser's AudioContext (zero external dependencies!)
  const triggerBeepSound = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(1400, audioCtx.currentTime); // High pitched beep
      gainNode.gain.setValueAtTime(0.12, audioCtx.currentTime);

      oscillator.start();
      // Beep duration of 110ms
      setTimeout(() => {
        oscillator.stop();
        audioCtx.close();
      }, 110);
    } catch (err) {
      console.warn("AudioContext not supported or blocked by user interaction", err);
    }
  };

  // Quick action mock code items for developer validation and manual tests
  const barcodeSamples = [
    { code: "7891120216589", label: "Meia Malha Branca (216589)" },
    { code: "7894561195825", label: "Moletom Felpado (195825)" },
    { code: "7890002216598", label: "Ribana Canelada (216598)" },
    { code: "7895552216601", label: "Malha Piquet (216601)" },
    { code: "7891120216612", label: "Fio Poliéster Tinto (216612)" }
  ];

  useEffect(() => {
    // Probe available cameras when component mounts
    Html5Qrcode.getCameras()
      .then(devices => {
        if (devices && devices.length > 0) {
          setCameras(devices);
          // Prefer back camera if available
          const backCam = devices.find(device => 
            device.label.toLowerCase().includes("back") || 
            device.label.toLowerCase().includes("traseira") ||
            device.label.toLowerCase().includes("ambiente")
          );
          setSelectedCameraId(backCam ? backCam.id : devices[0].id);
        } else {
          setScannerError("Nenhuma câmera física detectada. Ativando o Painel de Simulação Inteligente.");
          setSimulationMode(true);
        }
      })
      .catch(err => {
        console.warn("Error accessing camera. Falling back to simulation.", err);
        setScannerError("Acesso à câmera impedido ou não suportado no navegador atual. Ative a simulação abaixo.");
        setSimulationMode(true);
      });

    return () => {
      stopCameraScan();
    };
  }, []);

  const startCameraScan = async () => {
    if (!selectedCameraId) {
      setScannerError("Por favor, selecione uma câmera válida.");
      return;
    }
    setScannerError(null);
    setIsScanning(true);

    try {
      if (qrCodeInstanceRef.current) {
        await stopCameraScan();
      }

      const html5QrCode = new Html5Qrcode(scannerId);
      qrCodeInstanceRef.current = html5QrCode;

      const config = {
        fps: 15,
        qrbox: { width: 250, height: 160 },
        aspectRatio: 1.777778 // 16:9 widescreen
      };

      await html5QrCode.start(
        selectedCameraId,
        config,
        (decodedText) => {
          handleSuccessfulBarcode(decodedText);
        },
        (errorMessage) => {
          if (onScanError) onScanError(errorMessage);
        }
      );
    } catch (err: any) {
      console.error("Failed to start scan:", err);
      setScannerError(`Falha ao iniciar stream de vídeo: ${err?.message || err}`);
      setIsScanning(false);
    }
  };

  const stopCameraScan = async () => {
    if (qrCodeInstanceRef.current && qrCodeInstanceRef.current.isScanning) {
      try {
        await qrCodeInstanceRef.current.stop();
      } catch (err) {
        console.error("Error during stop:", err);
      }
    }
    qrCodeInstanceRef.current = null;
    setIsScanning(false);
  };

  const handleSuccessfulBarcode = (code: string) => {
    const cleansed = code.trim().replace(/[^0-9A-Za-z-]/g, "");
    if (!cleansed) return;

    // Cooldown logic: avoid registering the duplicate barcode too rapidly
    const now = Date.now();
    if (lastScannedRef.current && lastScannedRef.current.code === cleansed) {
      const elapsed = now - lastScannedRef.current.timestamp;
      if (elapsed < 1850) {
        return;
      }
    }
    lastScannedRef.current = { code: cleansed, timestamp: now };

    triggerBeepSound();
    
    // Provide nice visual response
    setScanFeedbackMsg(`CÓDIGO DE BARRAS CAPTURADO: ${cleansed}`);
    setTimeout(() => {
      setScanFeedbackMsg(null);
    }, 3500);

    // Bubble up to main form
    onScanSuccess(cleansed);
  };

  const executeSimulation = (mockCode: string) => {
    handleSuccessfulBarcode(mockCode);
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualInput.trim()) {
      handleSuccessfulBarcode(manualInput.trim());
      setManualInput("");
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm relative" id="barcode-scanner-widget">
      {/* Target scanning flash animations */}
      <AnimatePresence>
        {scanFeedbackMsg && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-4 left-4 right-4 z-50 bg-blue-50 border border-blue-400 text-blue-800 px-4 py-3 rounded-lg text-sm flex items-center justify-between shadow-lg"
          >
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 bg-blue-600 rounded-full animate-ping" />
              <span className="font-mono font-bold text-blue-900">{scanFeedbackMsg}</span>
            </div>
            <span className="text-xs text-blue-700 font-bold uppercase py-0.5 px-1.5 bg-blue-100 rounded">Capturado</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="p-5 border-b border-slate-200 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-blue-100 rounded-lg text-blue-700 border border-blue-200">
            <Camera className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-850">
              Coletor de Dados de Câmera
            </h3>
            <p className="text-xs text-slate-500">Leitor de barras integrado padrão ERP</p>
          </div>
        </div>

        {/* Header controller tabs */}
        <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs">
          <button
            type="button"
            onClick={() => {
              setSimulationMode(false);
              stopCameraScan();
            }}
            className={`px-3 py-1.5 rounded-md font-semibold transition-all ${
              !simulationMode 
                ? "bg-white text-blue-900 shadow-sm border border-slate-200" 
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Câmera Ativa
          </button>
          <button
            type="button"
            onClick={() => {
              setSimulationMode(true);
              stopCameraScan();
            }}
            className={`px-3 py-1.5 rounded-md font-semibold transition-all ${
              simulationMode 
                ? "bg-white text-blue-900 shadow-sm border border-slate-200" 
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Simulador ERP
          </button>
        </div>
      </div>

      <div className="p-5">
        {/* Continuous Scan Mode Selector Panel */}
        <div className="mb-4 bg-slate-50 border border-slate-200 rounded-xl p-3 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <span className={`relative flex h-2 w-2`}>
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${continuousMode ? "bg-blue-400 opacity-75" : "bg-slate-400 opacity-40"}`}></span>
                <span className={`relative inline-flex rounded-full h-2 w-2 ${continuousMode ? "bg-blue-600" : "bg-slate-400"}`}></span>
              </span>
              <span className="text-[10px] font-bold text-slate-705 uppercase tracking-wider font-mono">
                Recebimento Simplificado em Lote
              </span>
            </div>
            <p className="text-[10px] text-slate-500">
              {continuousMode 
                ? "Detectar código idêntico soma automaticamente +1 na QUANTIDADE DE SACOS" 
                : "Preenche os campos da ficha de recebimento para inserção individual"
              }
            </p>
          </div>
          <button
            type="button"
            onClick={() => onToggleContinuousMode(!continuousMode)}
            className={`text-xs font-bold px-3.5 py-1.5 rounded-lg border transition-all flex items-center justify-center gap-1.5 active:scale-95 shrink-0 ${
              continuousMode
                ? "bg-blue-600 hover:bg-blue-700 text-white border-blue-700 shadow-sm"
                : "bg-slate-100 hover:bg-slate-200 text-slate-600 border-slate-350 hover:text-slate-800"
            }`}
          >
            Modo Scan Contínuo
          </button>
        </div>

        {!simulationMode ? (
          /* ACTIVE CAMERA CAPTURE SECTION */
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-605 mb-1.5">Dispositivo de Imagem</label>
                <div className="flex gap-2">
                  <select
                    value={selectedCameraId}
                    onChange={(e) => {
                      setSelectedCameraId(e.target.value);
                      if (isScanning) {
                        setTimeout(() => startCameraScan(), 100);
                      }
                    }}
                    className="flex-1 text-xs bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:border-blue-500"
                  >
                    {cameras.length === 0 ? (
                      <option value="">Buscando câmeras...</option>
                    ) : (
                      cameras.map((camera, idx) => (
                        <option key={camera.id} value={camera.id}>
                          {camera.label || `Câmera ${idx + 1}`}
                        </option>
                      ))
                    )}
                  </select>
                  <button
                    type="button"
                    title="Recarregar Câmeras"
                    onClick={() => {
                      Html5Qrcode.getCameras().then(devices => {
                        setCameras(devices);
                        if (devices.length > 0 && !selectedCameraId) {
                          setSelectedCameraId(devices[0].id);
                        }
                      });
                    }}
                    className="p-2 bg-white hover:bg-slate-100 text-slate-700 rounded-lg border border-slate-300 transition"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="flex items-end">
                {isScanning ? (
                  <button
                    type="button"
                    onClick={stopCameraScan}
                    className="w-full text-xs bg-rose-650 hover:bg-rose-700 text-white font-semibold py-2.5 px-4 rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-sm"
                  >
                    <span className="w-2 h-2 bg-white rounded-full animate-ping" />
                    Parar Leitor de Câmera
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={startCameraScan}
                    className="w-full text-xs bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-4 rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-sm"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    Iniciar Leitor de Câmera
                  </button>
                )}
              </div>
            </div>

            {/* Video viewport container */}
            <div className="relative bg-slate-900 border border-slate-200 rounded-lg overflow-hidden min-h-[220px] flex flex-col items-center justify-center">
              {/* Custom scanning visual guides overlay */}
              {isScanning && (
                <div className="absolute inset-0 z-30 pointer-events-none flex items-center justify-center">
                  <div className="w-60 h-36 border-2 border-blue-500 rounded-md relative shadow-[0_0_0_400px_rgba(0,0,0,0.5)]">
                    {/* Corner Reticles */}
                    <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-blue-400 -mt-1.5 -ml-1.5 rounded-tl" />
                    <div className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-blue-400 -mt-1.5 -mr-1.5 rounded-tr" />
                    <div className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-blue-400 -mb-1.5 -ml-1.5 rounded-bl" />
                    <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-blue-400 -mb-1.5 -mr-1.5 rounded-br" />
                    
                    {/* Laser line effect */}
                    <div className="absolute left-1 right-1 h-0.5 bg-blue-400 top-1/2 -translate-y-1/2 animate-bounce shadow-[0_0_10px_2px_rgba(59,130,246,0.6)]" />
                  </div>
                  <div className="absolute bottom-3 text-[10px] font-mono tracking-wider text-white bg-slate-900/90 py-1 px-2.5 rounded-full border border-slate-700">
                    ALINHE O CÓDIGO DE BARRAS NO RETÍCULO
                  </div>
                </div>
              )}

              {/* Html5-qrcode mount target */}
              <div 
                id={scannerId} 
                className={`w-full max-w-full ${isScanning ? "block" : "hidden"} [&>video]:w-full [&>video]:object-cover [&>video]:max-h-[300px]`}
              />

              {!isScanning && (
                <div className="p-6 text-center max-w-sm space-y-3">
                  <div className="w-12 h-12 bg-slate-100 border border-slate-200 rounded-full flex items-center justify-center mx-auto text-slate-500">
                    <Camera className="w-5 h-5 text-slate-500" />
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-slate-700">Câmera em Standby</h4>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Inicie o leitor para acionar a câmera do dispositivo do conferente.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {scannerError && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-700 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
                <p>{scannerError}</p>
              </div>
            )}
          </div>
        ) : (
          /* INTELLIGENT SIMULATION PANEL - Flawless offline workflow helper */
          <div className="space-y-4">
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs leading-relaxed text-blue-800 flex gap-2 w-full">
              <Sparkles className="w-4 h-4 text-blue-600 shrink-0 mt-0.5 animate-pulse" />
              <div>
                <span className="font-bold">Mecanismo de Simulação Logística Ativo:</span> Clique em qualquer etiqueta comercial abaixo para simular instantaneamente a leitura do leitor de mão. O software extrairá os últimos 6 dígitos.
              </div>
            </div>

            <div className="space-y-2">
              <span className="text-xs font-semibold text-slate-600">Embalagens & Etiquetas Prontas para Conferência:</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {barcodeSamples.map((sample) => (
                  <button
                    key={sample.code}
                    type="button"
                    onClick={() => executeSimulation(sample.code)}
                    className="flex items-center justify-between p-2.5 bg-white hover:bg-slate-50 border border-slate-200 hover:border-blue-300 rounded-lg text-left transition group active:scale-[0.98] shadow-xs"
                  >
                    <div className="space-y-0.5">
                      <div className="text-[11px] font-bold text-slate-705 group-hover:text-blue-600 transition">
                        {sample.label}
                      </div>
                      <div className="font-mono text-[10px] text-slate-500 tracking-wider">
                        EAN {sample.code}
                      </div>
                    </div>
                    <span className="text-[10px] font-mono text-blue-700 bg-blue-50 px-2 py-1 rounded border border-blue-200 font-bold">
                      SIMULAR
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Manual Text input simulator */}
            <form onSubmit={handleManualSubmit} className="pt-2 border-t border-slate-200">
              <label htmlFor="manual-bar-input" className="block text-xs font-semibold text-slate-600 mb-1.5">
                Digitação Direta / Teclado Coletor USB
              </label>
              <div className="flex gap-2">
                <input
                  id="manual-bar-input"
                  type="text"
                  placeholder="EX: 7891234567890"
                  value={manualInput}
                  onChange={(e) => setManualInput(e.target.value.replace(/[^0-9A-Za-z-]/g, ""))}
                  className="flex-1 bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 font-mono tracking-wider"
                />
                <button
                  type="submit"
                  className="text-xs bg-slate-800 hover:bg-slate-900 text-white px-3.5 py-2 rounded-lg font-bold transition"
                >
                  Registrar
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* Corporate barcode instructions */}
      <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-[10px] font-mono text-slate-500">
        <div className="flex items-center gap-1.5">
          <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
          <span>Fórmula ERP: Sufixo = últimos 6 dígitos (Eclusivo para preenchimento de Ordem/PEN)</span>
        </div>
        <span className="text-slate-500 bg-white px-1.5 py-0.5 rounded border border-slate-200">EAN-13 / ITF-14</span>
      </div>
    </div>
  );
}
