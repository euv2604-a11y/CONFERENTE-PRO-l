import React, { useState, useEffect } from "react";
import { 
  Database, 
  Wifi, 
  WifiOff, 
  Layers, 
  Sparkles, 
  QrCode, 
  FileCheck, 
  Save, 
  CloudLightning,
  AlertTriangle,
  Info,
  Calendar,
  Clock,
  MapPin,
  ClipboardList,
  Binary,
  Maximize2,
  Trash2,
  CheckCircle,
  Smartphone,
  ChevronDown,
  FileDown,
  X,
  User,
  Truck
} from "lucide-react";
import { ERPRecord, PresetProduct, OfflineSyncStatus } from "./types";
import { PRESET_PRODUCTS, INITIAL_RECORDS } from "./data/mockPresets";
import { exportToCSV, exportToPDF, exportToHTML } from "./utils/exportUtils";
import BarcodeScanner from "./components/BarcodeScanner";
import ERPSpreadsheet from "./components/ERPSpreadsheet";
import { motion, AnimatePresence } from "motion/react";

export default function App() {
  // State hook for offline inspection database lists
  const [records, setRecords] = useState<ERPRecord[]>([]);
  
  // State for offline status control
  const [isOffline, setIsOffline] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: "success" | "info" } | null>(null);
  const [continuousMode, setContinuousMode] = useState<boolean>(false);

  // Form details states
  const [conferente, setConferente] = useState<string>("Alessandro");
  const [motorista, setMotorista] = useState<string>("Albano");
  const [barcode, setBarcode] = useState<string>("");
  const [lastSixDigits, setLastSixDigits] = useState<string>("");
  const [date, setDate] = useState<string>("");
  const [time, setTime] = useState<string>("");
  const [origin, setOrigin] = useState<string>("FACÇÃO");
  const [order, setOrder] = useState<string>("");
  const [pen, setPen] = useState<string>("");
  const [nf, setNf] = useState<string>("");
  const [kg, setKg] = useState<string>("");
  const [washing, setWashing] = useState<string>("");
  const [crates, setCrates] = useState<number>(1);
  const [boxes, setBoxes] = useState<number>(0);
  const [packaging, setPackaging] = useState<string>("Embalado");
  const [obs, setObs] = useState<string>("");

  // PWA mobile installation instructions drawer toggle
  const [showPwaHelp, setShowPwaHelp] = useState<boolean>(false);

  // Load records from LocalStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("erp_conferencia_records");
    if (saved) {
      try {
        setRecords(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse saved records, loading default presets.");
        setRecords(INITIAL_RECORDS);
      }
    } else {
      // Set defaults for visual representation on first run
      setRecords(INITIAL_RECORDS);
      localStorage.setItem("erp_conferencia_records", JSON.stringify(INITIAL_RECORDS));
    }

    // Set form system date and time defaults to current local time
    const today = new Date();
    setDate(today.toISOString().split("T")[0]);
    
    const hh = String(today.getHours()).padStart(2, '0');
    const mm = String(today.getMinutes()).padStart(2, '0');
    setTime(`${hh}:${mm}`);
  }, []);

  // Update localStorage whenever records change
  const saveRecordsToDB = (updatedList: ERPRecord[]) => {
    setRecords(updatedList);
    localStorage.setItem("erp_conferencia_records", JSON.stringify(updatedList));
  };

  // Triggers a neat overlay message
  const triggerToast = (text: string, type: "success" | "info" = "success") => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // Automatically captures barcode scanning triggers
  const handleBarcodeScanned = (scannedCode: string) => {
    // If continuous mode is enabled and barcode is scanned again, increment the crates count automatically
    if (continuousMode && barcode === scannedCode) {
      setCrates((prev) => {
        const nextVal = prev + 1;
        triggerToast(`Código idêntico [${scannedCode.slice(-6)}] detectado! QUANTIDADE DE SACOS incrementada para ${nextVal}.`, "success");
        return nextVal;
      });
      return;
    }

    setBarcode(scannedCode);
    
    // Automatic 6-digit extraction
    const suffix = scannedCode.slice(-6);
    setLastSixDigits(suffix);

    // Look for preset database match
    const foundPreset = PRESET_PRODUCTS.find(p => p.barcodeSuffix === suffix);

    // Refresh dynamic date/time for active receipt
    const now = new Date();
    setDate(now.toISOString().split("T")[0]);
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    setTime(`${hh}:${mm}`);

    // Set crates back to 1 and boxes to 0 for a new distinct item scan
    setCrates(1);
    setBoxes(0);

    if (foundPreset) {
      // High-fidelity pre-filling
      setOrigin(foundPreset.defaultOrigin);
      setOrder(suffix);
      setPen(foundPreset.defaultPen);
      setKg(String(foundPreset.defaultKg));
      setWashing(foundPreset.defaultWashing === "Não Requer" ? "" : foundPreset.defaultWashing);
      setPackaging(foundPreset.defaultPackaging);
      setObs(`Preenchimento automático via sufixo EAN [${foundPreset.name}].`);
      
      triggerToast(`Op/Produto Identificado: ${foundPreset.name} (${suffix})!`, "success");
    } else {
      // No preset found: Generate clean empty prompts so the user doesn't get locked out
      setOrder(suffix);
      setPen("O");
      setKg("");
      setWashing("");
      setPackaging("Embalado");
      setObs("Novo lote cadastrado via terminal de recepção.");
      
      triggerToast(`Código novo (${suffix}). Preencha os detalhes manuais para concluir.`, "info");
    }
  };

  // Submit the inspection form
  const handleSaveInspection = (e: React.FormEvent) => {
    e.preventDefault();

    if (!barcode) {
      alert("Por favor, capture ou digite um código de barras antes de salvar.");
      return;
    }

    const newRecord: ERPRecord = {
      id: `rec-${Date.now()}`,
      barcode: barcode.trim(),
      lastSixDigits: lastSixDigits || barcode.trim().slice(-6) || "------",
      date: date || new Date().toISOString().split("T")[0],
      time: time || "00:00",
      origin: origin || "FACÇÃO",
      order: order.trim() || lastSixDigits || barcode.trim().slice(-6) || "------",
      pen: pen.trim() || "N/A",
      nf: nf.trim() || "N/A",
      kg: parseFloat(kg) || 0.0,
      washing: washing.trim() || "",
      crates: crates,
      boxes: boxes,
      packaging: packaging,
      obs: obs.trim() || "Nenhuma observação.",
      conferente: conferente.trim() || "Alessandro",
      motorista: motorista.trim() || "Albano"
    };

    const nextRecords = [newRecord, ...records];
    saveRecordsToDB(nextRecords);
    triggerToast("Conferência registrada com sucesso na planilha local!");

    // Clear form to allow next scan
    setBarcode("");
    setLastSixDigits("");
    setOrder("");
    setPen("");
    setNf("");
    setKg("");
    setWashing("");
    setCrates(1);
    setBoxes(0);
    setPackaging("Embalado");
    setObs("");
    
    // Reset date/time to now for next sequential record
    const today = new Date();
    setDate(today.toISOString().split("T")[0]);
    const hh = String(today.getHours()).padStart(2, '0');
    const mm = String(today.getMinutes()).padStart(2, '0');
    setTime(`${hh}:${mm}`);
  };

  // Deletion logic
  const handleDeleteRecord = (id: string) => {
    if (confirm("Deseja realmente excluir este lançamento da tela local?")) {
      const filtered = records.filter(r => r.id !== id);
      saveRecordsToDB(filtered);
      triggerToast("Registro removido.", "info");
    }
  };

  // Clear all history logic
  const handleClearAllHistory = () => {
    if (confirm("🚨 ATENÇÃO: Tem certeza que deseja apagar TODO o histórico de lançamentos locais? Essa ação não pode ser desfeita e todas as linhas presentes na planilha serão deletadas.")) {
      saveRecordsToDB([]);
      triggerToast("Histórico de conferências totalmente limpo!", "info");
    }
  };

  // Inline update logic
  const handleUpdateRecord = (updated: ERPRecord) => {
    const updatedList = records.map(r => r.id === updated.id ? updated : r);
    saveRecordsToDB(updatedList);
    triggerToast("Lançamento atualizado na planilha com sucesso!");
  };

  // Trigger Local Sync simulator
  const handleTriggerCloudSync = () => {
    if (records.length === 0) {
      triggerToast("Nenhum lançamento local disponível para sincronização.", "info");
      return;
    }
    setIsSyncing(true);
    setTimeout(() => {
      setIsSyncing(false);
      // Clean up local registry upon online transmission ("Planilha online deleta as informações")
      saveRecordsToDB([]);
      triggerToast("Sincronização concluída! Os dados foram enviados à Planilha Online e limpos do coletor local com sucesso.", "success");
    }, 2100);
  };

  // Quick preset loader buttons
  const loadQuickPreset = (preset: PresetProduct) => {
    const mockFullCode = `789000${preset.barcodeSuffix}`;
    handleBarcodeScanned(mockFullCode);
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 font-sans pb-16 relative">
      {/* Floating System-Wide Alerts/Toasts */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className={`fixed bottom-6 right-6 z-50 px-5 py-4 rounded-xl shadow-xl border text-sm max-w-md flex items-start gap-3 ${
              toastMessage.type === "success" 
                ? "bg-white border-blue-200 text-blue-800 shadow-blue-900/10" 
                : "bg-white border-amber-200 text-amber-805 shadow-amber-900/10"
            }`}
          >
            <div className={`p-1.5 rounded-lg shrink-0 ${
              toastMessage.type === "success" ? "bg-blue-100 text-blue-700" : "bg-amber-100 text-amber-700"
            }`}>
              <CheckCircle className="w-5 h-5" />
            </div>
            <div>
              <p className="font-bold text-slate-900">Atualização do Coletor</p>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">{toastMessage.text}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Primary Top Corporate Banner Navigation (Blue/White style) */}
      <header className="border-b border-blue-950 bg-blue-900 text-white sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-white flex items-center justify-center font-display font-black text-blue-900 text-xl tracking-tighter">
              E
            </div>
            <div>
              <h1 className="text-sm font-bold font-display tracking-wide text-white flex items-center gap-1.5 uppercase">
                Conferência de Produtos
                <span className="text-[10px] font-mono font-bold bg-blue-800 text-white py-0.5 px-2 rounded border border-blue-750 tracking-normal capitalize">
                  Módulo ERP
                </span>
              </h1>
              <p className="text-[10px] font-mono text-blue-200 uppercase">INDÚSTRIA - RECEBIMENTO E EXPEDIÇÃO</p>
            </div>
          </div>

          {/* Connection Status controls and install instruction triggers */}
          <div className="flex items-center gap-3">
            {/* Install APK Drawer Button */}
            <button
              type="button"
              onClick={() => setShowPwaHelp(true)}
              className="hidden lg:flex text-xs px-3 py-1.5 bg-blue-800/40 hover:bg-blue-800/80 text-white border border-blue-750 rounded-lg items-center gap-1.5 transition active:scale-95 cursor-pointer"
            >
              <Smartphone className="w-4 h-4 text-white" />
              <span>Instalar no Celular</span>
            </button>

            {/* Simulated Offline Toggle */}
            <div className="flex items-center gap-1.5 bg-blue-950/40 px-2 py-1 rounded-lg border border-blue-800/30">
              <button
                type="button"
                onClick={() => {
                  const targetState = !isOffline;
                  setIsOffline(targetState);
                  triggerToast(
                    targetState 
                      ? "Modo TOTALMENTE OFFLINE ATIVADO. Seus dados continuam salvando normalmente no navegador." 
                      : "Modo ONLINE RESTABELECIDO. Pronto para sincronização em nuvem.",
                    "info"
                  );
                }}
                className={`text-[10px] font-semibold py-1 px-2.5 rounded-md flex items-center gap-1.5 transition ${
                  isOffline 
                    ? "bg-amber-600 text-white" 
                    : "bg-blue-800 text-white"
                }`}
                title="Clique para Simular Oscilação ou Rede Offline (Testar Modo Offline)"
              >
                {isOffline ? (
                  <>
                    <WifiOff className="w-3 h-3" />
                    <span>Modo Offline</span>
                  </>
                ) : (
                  <>
                    <Wifi className="w-3 h-3 animate-pulse" />
                    <span>Conexão Ativa</span>
                  </>
                )}
              </button>
            </div>

            {/* Cloud sync simulation button */}
            <button
              type="button"
              onClick={handleTriggerCloudSync}
              disabled={isSyncing || isOffline}
              className={`text-xs px-3.5 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 ${
                isOffline
                  ? "bg-blue-950/20 text-blue-300/40 border border-blue-950/30 cursor-not-allowed"
                  : isSyncing
                    ? "bg-blue-950/80 text-white border border-blue-900"
                    : "bg-white hover:bg-slate-100 text-blue-900 shadow-sm"
              }`}
            >
              <CloudLightning className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin" : ""}`} />
              <span>{isSyncing ? "Enviando..." : "Sincronizar"}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container Dashboard */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        
        {/* Offline Banner alert if toggled */}
        {isOffline && (
          <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 leading-relaxed flex items-start gap-3 shadow-2xs">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
            <div>
              <span className="font-bold">CONFERENTE EM MODO DESCONECTADO (Local Storage Solicitado):</span> O aplicativo está rodando em modo sandbox offline 100% isolado. Todos os lançamentos, varreduras de código de barras e edição de planilhas locais serão salvos com segurança em seu armazenamento físico. Você poderá reativar a conexão acima a qualquer momento e exportar em CSV ou PDF.
            </div>
          </div>
        )}

        {/* Dynamic Preset Suggestions Helper Box */}
        <div className="mb-6 bg-blue-50/60 border border-blue-100 p-4 rounded-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex gap-2 text-xs">
            <Info className="w-4.5 h-4.5 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <span className="text-slate-800 font-bold block">Sugestões de Simulação (Clique para Teste Rápido)</span>
              <p className="text-slate-600 mt-0.5">Clique nas tags abaixo para testar o preenchimento automático a partir de mercadorias catalogadas na fábrica:</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {PRESET_PRODUCTS.map((prod) => (
              <button
                key={prod.barcodeSuffix}
                type="button"
                onClick={() => loadQuickPreset(prod)}
                className="text-[10px] font-mono font-bold px-2.5 py-1.5 bg-white border border-slate-250 rounded-lg hover:bg-slate-50 hover:border-slate-350 hover:text-slate-900 transition shadow-2xs"
                title={`Suffix: ${prod.barcodeSuffix} (${prod.name})`}
              >
                {prod.barcodeSuffix} - {prod.name.split(" ")[0]} ⚡
              </button>
            ))}
          </div>
        </div>

        {/* Bento Grid layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* LEFT PANEL: SCANNER + ENTRY FORM (Span 5) */}
          <div className="col-span-1 lg:col-span-5 space-y-6">
            
            {/* The Real-Time camera-based system parser */}
            <BarcodeScanner 
              onScanSuccess={handleBarcodeScanned} 
              onScanError={(err) => console.log("Silent scan log:", err)} 
              continuousMode={continuousMode}
              onToggleContinuousMode={setContinuousMode}
            />

            {/* THE FORM CONTROL EDIT PANEL */}
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
              <div className="p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-blue-50 text-blue-700 rounded-lg border border-blue-105">
                    <FileCheck className="w-5 h-5 text-blue-700" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-800">Ficha Técnica de Recebimento</h3>
                    <p className="text-xs text-slate-500">Controle simplificado de recebimento</p>
                  </div>
                </div>
              </div>

              <form onSubmit={handleSaveInspection} className="p-5 space-y-4">
                
                {/* Scanner & Manual EAN input info */}
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
                  <span className="text-[10px] font-mono font-black text-slate-500 uppercase flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />
                    Identificação de Carga / Varredura
                  </span>
                  
                  <div className="grid grid-cols-3 gap-2">
                    <div className="col-span-2">
                      <label htmlFor="form-barcode" className="block text-[9px] font-bold text-slate-500 mb-0.5">Código de Barras</label>
                      <input
                        id="form-barcode"
                        type="text"
                        placeholder="Aponte o leitor ou digite"
                        required
                        value={barcode}
                        onChange={(e) => {
                          const val = e.target.value.replace(/[^0-9A-Za-z-]/g, "");
                          setBarcode(val);
                          const suffix = val.slice(-6) || "";
                          setLastSixDigits(suffix);
                          if (suffix) {
                            setOrder(suffix);
                          }
                        }}
                        className="w-full bg-white border border-slate-250 rounded px-2 py-1 text-xs text-blue-700 font-bold focus:outline-none focus:border-blue-500 font-mono"
                      />
                    </div>
                    <div>
                      <label htmlFor="form-suffix" className="block text-[9px] font-bold text-slate-500 mb-0.5">Sufixo (Últimos 6)</label>
                      <input
                        id="form-suffix"
                        type="text"
                        readOnly
                        placeholder="Sufixo"
                        value={lastSixDigits || barcode.slice(-6)}
                        className="w-full bg-slate-100 border border-slate-200 rounded px-2 py-1 text-xs text-slate-600 font-bold text-center focus:outline-none font-mono"
                      />
                    </div>
                  </div>
                </div>

                {/* 1. Ordem field */}
                <div>
                  <label htmlFor="form-order" className="block text-[11px] font-bold text-slate-600 mb-1 flex items-center gap-1">
                    ORDEM <span className="text-red-500 font-bold">*</span>
                  </label>
                  <input
                    id="form-order"
                    type="text"
                    required
                    placeholder="Ex: 216589"
                    value={order}
                    onChange={(e) => setOrder(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-500 font-mono font-bold"
                  />
                </div>

                {/* 2. NF field */}
                <div>
                  <label htmlFor="form-nf" className="block text-[11px] font-bold text-slate-600 mb-1">
                    NF (Nota Fiscal)
                  </label>
                  <input
                    id="form-nf"
                    type="text"
                    placeholder="Ex: 10542"
                    value={nf}
                    onChange={(e) => setNf(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-500 font-mono"
                  />
                </div>

                {/* 3. Kilos field */}
                <div>
                  <label htmlFor="form-kg" className="block text-[11px] font-bold text-slate-600 mb-1 flex items-center gap-1">
                    KILOS <span className="text-red-500 font-bold">*</span>
                  </label>
                  <input
                    id="form-kg"
                    type="number"
                    step="0.01"
                    required
                    placeholder="Digite ou selecione abaixo"
                    value={kg}
                    onChange={(e) => setKg(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-blue-700 font-black focus:outline-none focus:border-blue-500 font-mono"
                  />
                  
                  {/* Selectable weight topics */}
                  <div className="grid grid-cols-3 gap-1.5 mt-2 bg-slate-50 p-1.5 rounded-lg border border-slate-200">
                    {[15, 20, 25, 30, 45].map((presetVal) => {
                      const isActive = parseFloat(kg) === presetVal;
                      return (
                        <button
                          key={presetVal}
                          type="button"
                          onClick={() => setKg(String(presetVal))}
                          className={`py-1 px-1.5 text-[10px] font-mono font-bold rounded-md border text-center transition ${
                            isActive
                              ? "bg-blue-600 border-blue-600 text-white shadow-sm font-black"
                              : "bg-white border-slate-200 text-slate-600 hover:bg-slate-100"
                          }`}
                        >
                          {presetVal.toFixed(1)} kg
                        </button>
                      );
                    })}
                    <button
                      type="button"
                      onClick={() => document.getElementById("form-kg")?.focus()}
                      className={`py-1 px-1.5 text-[10px] font-sans font-bold rounded-md border text-center transition ${
                        ![15, 20, 25, 30, 45].includes(parseFloat(kg)) && kg !== ""
                          ? "bg-blue-600 border-blue-600 text-white font-black"
                          : "bg-white border-slate-200 text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      Outro
                    </button>
                  </div>
                </div>

                {/* 4. Lavação field */}
                <div>
                  <label htmlFor="form-washing" className="block text-[11px] font-bold text-slate-600 mb-1">
                    LAVAÇÃO
                  </label>
                  <input
                    id="form-washing"
                    type="text"
                    placeholder="Ex: Industrial, Especial, Amaciado"
                    value={washing}
                    onChange={(e) => setWashing(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-500 font-mono"
                  />
                </div>

                {/* 5. Grades e Caixas block (Dois tópicos) */}
                <div className="grid grid-cols-2 gap-3">
                  {/* Grades Counter */}
                  <div>
                    <label htmlFor="form-crates" className="block text-[11.5px] font-bold text-slate-600 mb-1 flex items-center gap-1">
                      GRADES (gds) <span className="text-amber-500 font-bold">*</span>
                    </label>
                    <div className="flex gap-1.5 items-center">
                      <button
                        type="button"
                        onClick={() => setCrates(prev => Math.max(0, prev - 1))}
                        className="w-8 h-8 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg border border-slate-300 font-bold transition flex items-center justify-center text-xs"
                      >
                        -
                      </button>
                      <input
                        id="form-crates"
                        type="number"
                        required
                        min="0"
                        value={crates}
                        onChange={(e) => setCrates(Math.max(0, parseInt(e.target.value, 10) || 0))}
                        className="flex-1 min-w-[35px] bg-white border border-slate-300 rounded-lg py-1.5 text-xs text-amber-600 font-black text-center focus:outline-none font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => setCrates(prev => prev + 1)}
                        className="w-8 h-8 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg border border-slate-300 font-bold transition flex items-center justify-center text-xs"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* Caixas Counter */}
                  <div>
                    <label htmlFor="form-boxes" className="block text-[11.5px] font-bold text-slate-600 mb-1 flex items-center gap-1">
                      CAIXAS (cx) <span className="text-indigo-500 font-bold">*</span>
                    </label>
                    <div className="flex gap-1.5 items-center">
                      <button
                        type="button"
                        onClick={() => setBoxes(prev => Math.max(0, prev - 1))}
                        className="w-8 h-8 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg border border-slate-300 font-bold transition flex items-center justify-center text-xs"
                      >
                        -
                      </button>
                      <input
                        id="form-boxes"
                        type="number"
                        required
                        min="0"
                        value={boxes}
                        onChange={(e) => setBoxes(Math.max(0, parseInt(e.target.value, 10) || 0))}
                        className="flex-1 min-w-[35px] bg-white border border-slate-300 rounded-lg py-1.5 text-xs text-indigo-650 font-black text-center focus:outline-none font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => setBoxes(prev => prev + 1)}
                        className="w-8 h-8 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg border border-slate-300 font-bold transition flex items-center justify-center text-xs"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>

                {/* 6. Observação field */}
                <div>
                  <label htmlFor="form-obs" className="block text-[11px] font-bold text-slate-600 mb-1">
                    OBSERVAÇÃO
                  </label>
                  <textarea
                    id="form-obs"
                    rows={2}
                    placeholder="Descreva observações ou detalhes adicionais..."
                    value={obs}
                    onChange={(e) => setObs(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 font-mono"
                  />
                </div>

                {/* Submit button */}
                <button
                  type="submit"
                  className="w-full mt-2 cursor-pointer bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 px-4 rounded-xl text-xs transition flex items-center justify-center gap-2 shadow-md active:scale-[0.98]"
                >
                  <Save className="w-4 h-4 text-white" />
                  REGISTRAR ENTRADA LOCAL (F8)
                </button>

              </form>
            </div>
          </div>

          {/* RIGHT PANEL: SPREADSHEET (Span 7) */}
          <div className="col-span-1 lg:col-span-7">
            <ERPSpreadsheet
              records={records}
              onDeleteRecord={handleDeleteRecord}
              onUpdateRecord={handleUpdateRecord}
              onExportCSV={() => exportToCSV(records)}
              onExportPDF={() => exportToPDF(records)}
              onExportHTML={() => exportToHTML(records)}
              onClearHistory={handleClearAllHistory}
            />
          </div>

        </div>
      </main>

      {/* APK INSTALLATION GUIDES DRAWER FOR MOBILE USERS */}
      <AnimatePresence>
        {showPwaHelp && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white border border-slate-200 rounded-xl p-6 max-w-lg w-full relative shadow-xl"
            >
              <button
                type="button"
                onClick={() => setShowPwaHelp(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 bg-slate-100 p-1.5 rounded-lg border border-slate-200"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-3.5 mb-5">
                <div className="p-2.5 bg-blue-50 text-blue-700 rounded-xl border border-blue-105">
                  <Smartphone className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Instalação Direta no Celular (Modo PWA)</h3>
                  <p className="text-xs text-slate-500">Guia definitivo para uso no coletor móvel</p>
                </div>
              </div>

              <div className="space-y-4 text-xs text-slate-655 leading-relaxed">
                <p>
                  Como este aplicativo conta com um arquivo de manifesto corporativo (`manifest.json`), você <strong>não necessita de um compilador clássico de arquivos APK externos</strong>, que expira ou necessita estar em lojas de aplicativos como a Google Play Store.
                </p>
                
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg space-y-2 font-mono text-[11px] text-slate-700">
                  <p className="text-blue-700 font-bold flex items-center gap-1.5">
                    <span className="w-2 h-2 bg-blue-600 rounded-full inline-block animate-ping" />
                    COMO INSTALAR NO SMARTPHONE:
                  </p>
                  <ol className="list-decimal list-inside space-y-1.5 ml-1">
                    <li>Copie o link desta aplicação e abra em seu navegador móvel (Chrome no Android / Safari no iOS).</li>
                    <li>Clique no menu de opções do navegador (três pontos no topo/rodapé).</li>
                    <li>Clique em <strong>"Adicionar à Tela de Início"</strong> ou <strong>"Instalar Aplicativo"</strong>.</li>
                    <li>Pronto! Ele será instalado na tela de apps do seu celular com operação 100% offline nativa.</li>
                  </ol>
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowPwaHelp(false)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs transition"
                >
                  Entendi e Vou Configurar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
