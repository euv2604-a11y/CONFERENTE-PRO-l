import React, { useState } from "react";
import { ERPRecord } from "../types";
import { Search, Trash2, Edit2, FileDown, Layers, ChevronDown, Check, X, ArrowUpDown, Filter } from "lucide-react";

interface ERPSpreadsheetProps {
  records: ERPRecord[];
  onDeleteRecord: (id: string) => void;
  onUpdateRecord: (updated: ERPRecord) => void;
  onExportCSV: () => void;
  onExportPDF: () => void;
  onExportHTML: () => void;
  onClearHistory: () => void;
}

export default function ERPSpreadsheet({
  records,
  onDeleteRecord,
  onUpdateRecord,
  onExportCSV,
  onExportPDF,
  onExportHTML,
  onClearHistory,
}: ERPSpreadsheetProps) {
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filterPackaging, setFilterPackaging] = useState<string>("TODOS");
  const [sortField, setSortField] = useState<keyof ERPRecord>("date");
  const [sortAscending, setSortAscending] = useState<boolean>(false);
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);

  // Buffer state for the editing row
  const [editBuffer, setEditBuffer] = useState<ERPRecord | null>(null);

  // Pagination support
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 8;

  // Toggle sorting fields
  const handleSort = (field: keyof ERPRecord) => {
    if (sortField === field) {
      setSortAscending(!sortAscending);
    } else {
      setSortField(field);
      setSortAscending(true);
    }
  };

  // Search filter logic
  const filteredRecords = records.filter(rec => {
    const term = searchTerm.toLowerCase();
    const matchesSearch = 
      rec.barcode.toLowerCase().includes(term) ||
      rec.lastSixDigits.toLowerCase().includes(term) ||
      rec.origin.toLowerCase().includes(term) ||
      rec.order.toLowerCase().includes(term) ||
      rec.pen.toLowerCase().includes(term) ||
      rec.nf.toLowerCase().includes(term) ||
      (rec.conferente && rec.conferente.toLowerCase().includes(term)) ||
      (rec.motorista && rec.motorista.toLowerCase().includes(term)) ||
      (rec.obs && rec.obs.toLowerCase().includes(term));
    
    const matchesPackaging = filterPackaging === "TODOS" || rec.packaging === filterPackaging;
    
    return matchesSearch && matchesPackaging;
  });

  // Sorting logic
  const sortedRecords = [...filteredRecords].sort((a, b) => {
    let valA = a[sortField];
    let valB = b[sortField];

    if (typeof valA === "string" && typeof valB === "string") {
      return sortAscending ? valA.localeCompare(valB) : valB.localeCompare(valA);
    }
    if (typeof valA === "number" && typeof valB === "number") {
      return sortAscending ? valA - valB : valB - valA;
    }
    return 0;
  });

  // Paginated records
  const totalPages = Math.ceil(sortedRecords.length / itemsPerPage) || 1;
  const paginatedRecords = sortedRecords.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Stats calculation
  const totalWeight = sortedRecords.reduce((sum, r) => sum + r.kg, 0);
  const totalCrates = sortedRecords.reduce((sum, r) => sum + r.crates, 0);

  // Edit action handlers
  const startEditing = (rec: ERPRecord) => {
    setEditingId(rec.id);
    setEditBuffer({ ...rec });
  };

  const handleEditChange = (field: keyof ERPRecord, value: any) => {
    if (editBuffer) {
      // Re-calculate the last 6 digits if barcode changes
      let updatedLastSix = editBuffer.lastSixDigits;
      if (field === "barcode") {
        const cleansed = value.trim();
        updatedLastSix = cleansed.slice(-6) || "------";
      }

      setEditBuffer({
        ...editBuffer,
        [field]: value,
        lastSixDigits: field === "barcode" ? updatedLastSix : editBuffer.lastSixDigits
      });
    }
  };

  const saveInlineEdit = () => {
    if (editBuffer) {
      onUpdateRecord(editBuffer);
      setEditingId(null);
      setEditBuffer(null);
    }
  };

  const cancelInlineEdit = () => {
    setEditingId(null);
    setEditBuffer(null);
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm flex flex-col h-full" id="erp-spreadsheet-panel">
      {/* Spreadsheet Header Controller */}
      <div className="p-5 border-b border-slate-200 bg-slate-50 flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
            <Layers className="w-4.5 h-4.5 text-blue-600" />
            Planilha Local de Conferências (Offline DB)
          </h3>
          <p className="text-xs text-slate-550">Banco de dados seguro persistido no navegador web</p>
        </div>

        {/* Action button groupings */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onExportCSV}
            className="text-xs px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 font-semibold rounded-lg transition flex items-center gap-1.5 active:scale-95 shadow-2xs"
          >
            <FileDown className="w-4 h-4 text-blue-600" />
            CSV (Excel)
          </button>
          <button
            type="button"
            onClick={onExportPDF}
            className="text-xs px-3 py-1.5 bg-blue-600 hover:bg-blue-750 text-white font-bold rounded-lg transition flex items-center gap-1.5 shadow-xs active:scale-95"
          >
            <FileDown className="w-4 h-4" />
            PDF
          </button>
          <button
            type="button"
            onClick={onExportHTML}
            className="text-xs px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-lg transition flex items-center gap-1.5 shadow-xs active:scale-95"
          >
            <FileDown className="w-4 h-4 text-white" />
            HTML
          </button>
          <button
            type="button"
            onClick={onClearHistory}
            className="text-xs px-3 py-1.5 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 font-bold rounded-lg transition flex items-center gap-1.5 active:scale-95"
          >
            <Trash2 className="w-4 h-4 text-rose-600" />
            Limpar Histórico
          </button>
        </div>
      </div>

      {/* Industrial Summary Statistics Widgets */}
      <div className="grid grid-cols-1 border-b border-slate-200 bg-slate-50/50">
        <div className="p-4 flex items-center justify-between">
          <div>
            <span className="block text-[10px] uppercase font-mono tracking-wider text-slate-500">Lançamentos Registrados</span>
            <span className="text-lg font-bold font-mono text-slate-850 mt-1 block">{sortedRecords.length} lançamentos</span>
          </div>
          <span className="text-[10px] uppercase font-bold tracking-tight px-1.5 py-0.5 rounded bg-slate-200 text-slate-600 font-mono">Planilha em Tempo Real</span>
        </div>
      </div>

      {/* Grid Filtering Controls */}
      <div className="p-4 bg-white border-b border-slate-200 flex flex-col md:flex-row items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Pesquisar por Código, 6 Dígitos, Origem, Ordem, PEN, NF, Obs..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1); // reset page
            }}
            className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-4 py-2 text-slate-850 placeholder-slate-450 focus:outline-none focus:border-blue-500 hover:border-slate-300 font-mono transition"
          />
        </div>

        {/* Filter Packaging option */}
        <div className="flex items-center gap-2 w-full md:w-auto font-sans">
          <Filter className="w-4 h-4 text-slate-400 shrink-0" />
          <select
            value={filterPackaging}
            onChange={(e) => {
              setFilterPackaging(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full md:w-auto text-xs bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-700 focus:outline-none focus:border-blue-500 font-medium font-sans"
          >
            <option value="TODOS">Embalagem: Todas</option>
            <option value="Embalado">Embalagem: Embalado</option>
            <option value="Desembalado">Embalagem: Desembalado</option>
          </select>
        </div>
      </div>

      {/* The ERP Row Table Grid */}
      <div className="flex-1 overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[850px]">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-100 text-[10px] font-mono text-slate-600 select-none uppercase tracking-wider">
              <th className="p-3.5 pl-5 font-bold">
                <button type="button" onClick={() => handleSort("order")} className="flex items-center gap-1 hover:text-blue-700">
                  ORDEM <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </button>
              </th>
              <th className="p-3.5 font-bold">
                <button type="button" onClick={() => handleSort("nf")} className="flex items-center gap-1 hover:text-blue-700">
                  NF <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </button>
              </th>
              <th className="p-3.5 text-right font-bold">
                <button type="button" onClick={() => handleSort("kg")} className="flex items-center justify-end gap-1 hover:text-blue-700 ml-auto">
                  KILOS <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </button>
              </th>
              <th className="p-3.5 font-bold">
                <button type="button" onClick={() => handleSort("washing")} className="flex items-center gap-1 hover:text-blue-700">
                  LAVAÇÃO <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </button>
              </th>
              <th className="p-3.5 text-right font-bold">
                <button type="button" onClick={() => handleSort("crates")} className="flex items-center justify-end gap-1 hover:text-blue-700 ml-auto">
                  GRADES <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </button>
              </th>
              <th className="p-3.5 text-right font-bold">
                <button type="button" onClick={() => handleSort("boxes")} className="flex items-center justify-end gap-1 hover:text-blue-700 ml-auto">
                  CAIXAS <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </button>
              </th>
              <th className="p-3.5 font-bold">OBSERVAÇÃO</th>
              <th className="p-3.5 pr-5 text-right font-bold">AÇÕES</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs font-mono text-slate-700">
            {paginatedRecords.length === 0 ? (
              <tr>
                <td colSpan={8} className="p-12 text-center text-slate-400 italic bg-white">
                  Nenhum registro de conferência encontrado para os filtros atuais.
                </td>
              </tr>
            ) : (
              paginatedRecords.map((rec) => {
                const isEditing = editingId === rec.id;
 
                if (isEditing && editBuffer) {
                  return (
                    <tr key={rec.id} className="bg-blue-50/45 hover:bg-blue-50/20 transition">
                      {/* Order Edit */}
                      <td className="p-2 pl-5 min-w-[110px]">
                        <input
                          type="text"
                          value={editBuffer.order}
                          onChange={(e) => handleEditChange("order", e.target.value)}
                          className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs text-slate-850 font-bold focus:outline-none focus:border-blue-550"
                        />
                      </td>

                      {/* NF Edit */}
                      <td className="p-2 min-w-[90px]">
                        <input
                          type="text"
                          value={editBuffer.nf}
                          onChange={(e) => handleEditChange("nf", e.target.value)}
                          className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs text-slate-850 focus:outline-none focus:border-blue-550"
                        />
                      </td>
 
                      {/* Weight Edit (Weight in kg) */}
                      <td className="p-2 text-right">
                        <input
                          type="number"
                          step="0.01"
                          value={editBuffer.kg}
                          onChange={(e) => handleEditChange("kg", parseFloat(e.target.value) || 0)}
                          className="w-24 bg-white border border-slate-300 rounded p-1 text-right text-xs text-blue-600 font-bold focus:outline-none focus:border-blue-550"
                        />
                      </td>

                      {/* Washing Edit */}
                      <td className="p-2 min-w-[120px]">
                        <input
                          type="text"
                          value={editBuffer.washing}
                          onChange={(e) => handleEditChange("washing", e.target.value)}
                          className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs text-slate-800 focus:outline-none focus:border-blue-550"
                        />
                      </td>
 
                      {/* Grades Edit */}
                      <td className="p-2 text-right">
                        <input
                          type="number"
                          value={editBuffer.crates}
                          onChange={(e) => handleEditChange("crates", parseInt(e.target.value, 10) || 0)}
                          className="w-16 bg-white border border-slate-300 rounded p-1 text-right text-xs text-amber-600 font-bold focus:outline-none focus:border-blue-550"
                        />
                      </td>

                      {/* Caixas Edit */}
                      <td className="p-2 text-right">
                        <input
                          type="number"
                          value={editBuffer.boxes ?? 0}
                          onChange={(e) => handleEditChange("boxes", parseInt(e.target.value, 10) || 0)}
                          className="w-16 bg-white border border-slate-300 rounded p-1 text-right text-xs text-indigo-600 font-bold focus:outline-none focus:border-blue-550"
                        />
                      </td>

                      {/* Observation Edit */}
                      <td className="p-2 min-w-[150px]">
                        <input
                          type="text"
                          value={editBuffer.obs}
                          onChange={(e) => handleEditChange("obs", e.target.value)}
                          className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs text-slate-700 focus:outline-none focus:border-blue-550"
                        />
                      </td>
 
                      {/* Action buttons save/cancel in list */}
                      <td className="p-2 pr-5 text-right min-w-[90px]">
                        <div className="flex justify-end gap-1.5 font-sans">
                          <button
                             type="button"
                             onClick={saveInlineEdit}
                             title="Salvar"
                             className="p-1 px-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded shadow-xs transition"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={cancelInlineEdit}
                            title="Cancelar"
                            className="p-1 px-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded transition"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                }
 
                const isExpanded = expandedRowId === rec.id;
 
                return (
                  <React.Fragment key={rec.id}>
                    <tr className="hover:bg-slate-50 transition group border-b border-slate-100">
                      <td className="p-3.5 pl-5 cursor-pointer hover:text-blue-600 transition-colors" onClick={() => setExpandedRowId(isExpanded ? null : rec.id)}>
                        <div className="flex items-center gap-2">
                          <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isExpanded ? 'rotate-180 text-blue-600' : ''}`} />
                          <div className="space-y-0.5 text-left">
                            <span className="text-slate-850 font-bold text-xs tracking-wider">{rec.order}</span>
                            <div className="flex items-center gap-1">
                              <span className="text-[9px] text-slate-400 font-mono">EAN:</span>
                              <span className="text-[9px] text-slate-500 tracking-tighter truncate max-w-[80px]" title={rec.barcode}>
                                {rec.barcode}
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="p-3.5 text-slate-700 font-medium cursor-pointer" onClick={() => setExpandedRowId(isExpanded ? null : rec.id)}>
                        {rec.nf || "---"}
                      </td>
                      <td className="p-3.5 text-right font-bold text-blue-600 text-xs whitespace-nowrap cursor-pointer" onClick={() => setExpandedRowId(isExpanded ? null : rec.id)}>
                        {rec.kg.toFixed(2)} kg
                      </td>
                      <td className="p-3.5 text-slate-700 font-medium cursor-pointer" onClick={() => setExpandedRowId(isExpanded ? null : rec.id)}>
                        {rec.washing}
                      </td>
                      <td className="p-3.5 text-right font-black text-amber-600 cursor-pointer text-xs" onClick={() => setExpandedRowId(isExpanded ? null : rec.id)}>
                        {rec.crates} gds
                      </td>
                      <td className="p-3.5 text-right font-black text-indigo-600 cursor-pointer text-xs" onClick={() => setExpandedRowId(isExpanded ? null : rec.id)}>
                        {rec.boxes ?? 0} cx
                      </td>
                      <td className="p-3.5 text-slate-500 max-w-[180px] truncate cursor-pointer" title={rec.obs} onClick={() => setExpandedRowId(isExpanded ? null : rec.id)}>
                        {rec.obs || "---"}
                      </td>
                      <td className="p-3.5 pr-5 text-right">
                        <div className="flex justify-end gap-1 opacity-80 group-hover:opacity-100 transition">
                          <button
                            type="button"
                            onClick={() => startEditing(rec)}
                            title="Editar Registro"
                            className="p-1.5 bg-slate-100 hover:bg-blue-100 text-blue-705 rounded transition"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteRecord(rec.id)}
                            title="Deletar Registro"
                            className="p-1.5 bg-slate-100 hover:bg-rose-50 hover:text-rose-600 text-slate-500 rounded transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr className="bg-slate-50/60">
                        <td colSpan={8} className="p-4 pl-10 border-b border-slate-200">
                          <div className="bg-white rounded-lg p-4 border border-slate-200 shadow-xs grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                            <div className="space-y-1">
                              <span className="block text-[10px] uppercase text-slate-500 font-bold tracking-wider">Origem / Parceiro</span>
                              <span className="font-semibold text-slate-705 uppercase">{rec.origin}</span>
                            </div>
                            <div className="space-y-1">
                              <span className="block text-[10px] uppercase text-slate-500 font-bold tracking-wider">PEN</span>
                              <span className="font-semibold text-slate-705">{rec.pen || "N/A"}</span>
                            </div>
                            <div className="space-y-1">
                              <span className="block text-[10px] uppercase text-slate-500 font-bold tracking-wider">Nota Fiscal (NF)</span>
                              <span className="font-mono text-slate-705">{rec.nf || "N/A"}</span>
                            </div>
                            <div className="space-y-1">
                              <span className="block text-[10px] uppercase text-slate-500 font-bold tracking-wider">Embalagem</span>
                              <span className="font-semibold text-slate-705">{rec.packaging}</span>
                            </div>
                            <div className="space-y-1">
                              <span className="block text-[10px] uppercase text-slate-500 font-bold tracking-wider">Conferente Responsável</span>
                              <span className="font-semibold text-slate-705">{rec.conferente || "N/A"}</span>
                            </div>
                            <div className="space-y-1">
                              <span className="block text-[10px] uppercase text-slate-500 font-bold tracking-wider">Motorista / Transportador</span>
                              <span className="font-semibold text-slate-750">{rec.motorista || "N/A"}</span>
                            </div>
                            <div className="space-y-1 col-span-2">
                              <span className="block text-[10px] uppercase text-slate-500 font-bold tracking-wider">Data e Hora de Registro</span>
                              <span className="font-mono text-slate-705">{rec.date} às {rec.time}</span>
                            </div>
                            {rec.obs ? (
                              <div className="space-y-1 col-span-2 md:col-span-4 border-t border-slate-100 pt-2">
                                <span className="block text-[10px] uppercase text-slate-500 font-bold tracking-wider">Observações do Recebimento</span>
                                <p className="text-slate-500 italic text-xs whitespace-pre-line leading-relaxed">{rec.obs}</p>
                              </div>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Spreadsheet grid results footer (pagination) */}
      <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-500 font-mono">
        <div>
          Mostrando <span className="text-slate-800 font-bold">{paginatedRecords.length}</span> de{" "}
          <span className="text-slate-800 font-bold">{sortedRecords.length}</span> registros.
        </div>

        {totalPages > 1 && (
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              className="px-2.5 py-1 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white text-slate-600 rounded border border-slate-300 transition shadow-2xs"
            >
              Anterior
            </button>
            <span className="px-3 text-slate-700 font-semibold font-mono">
              Pág. {currentPage} de {totalPages}
            </span>
            <button
              type="button"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              className="px-2.5 py-1 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white text-slate-600 rounded border border-slate-300 transition shadow-2xs"
            >
              Próxima
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
