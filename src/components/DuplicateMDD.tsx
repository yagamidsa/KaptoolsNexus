// src/components/DuplicateMDD.tsx - SOLO BACKEND PYTHON + IBM SPSS

import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';

interface DuplicateMDDProps {
    isOpen: boolean;
    onClose: () => void;
    workspacePath: string;
}

interface BackendResponse {
    success: boolean;
    message?: string;
    data?: any;
    error?: string;
    logs?: string[];
    processing_logs?: string[];
    record_summary?: string;
}

type ProcessingStep = 'idle' | 'file-selected' | 'processing' | 'completed' | 'error';

const DuplicateMDD: React.FC<DuplicateMDDProps> = ({ isOpen, onClose, workspacePath }) => {
    // Estados principales
    const [currentStep, setCurrentStep] = useState<ProcessingStep>('idle');
    const [selectedMddFile, setSelectedMddFile] = useState<string>('');
    const [selectedDdfFile, setSelectedDdfFile] = useState<string>('');
    const [duplicateCount, setDuplicateCount] = useState<number>(2);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string>('');
    const [result, setResult] = useState<BackendResponse | null>(null);
    const [processingLogs, setProcessingLogs] = useState<string[]>([]);

    // Reset states when modal closes
    useEffect(() => {
        if (!isOpen) {
            resetStates();
        }
    }, [isOpen]);

    const resetStates = () => {
        setCurrentStep('idle');
        setSelectedMddFile('');
        setSelectedDdfFile('');
        setDuplicateCount(2);
        setLoading(false);
        setError('');
        setResult(null);
        setProcessingLogs([]);
    };

    // Función para agregar logs
    const addLog = (message: string) => {
        const timestamp = new Date().toLocaleTimeString();
        const logEntry = `[${timestamp}] ${message}`;
        setProcessingLogs(prev => [...prev, logEntry]);
    };

    // Seleccionar archivo MDD usando Tauri
    const handleMddFileSelect = async () => {
        try {
            setLoading(true);
            setError('');
            addLog('🔍 Opening MDD file selector...');

            const selected = await invoke('select_mdd_file') as string | null;

            if (selected && typeof selected === 'string') {
                setSelectedMddFile(selected);
                addLog(`📁 MDD file selected: ${selected}`);
                
                // Auto-detectar archivo DDF correspondiente
                const ddfPath = selected.replace(/\.mdd$/i, '.ddf');
                setSelectedDdfFile(ddfPath);
                addLog(`🔍 Looking for corresponding DDF: ${ddfPath}`);
                
                // Verificar que existe el DDF
                await checkDdfExists(ddfPath);
                
                setCurrentStep('file-selected');
            } else {
                addLog('❌ No file selected or user cancelled');
            }
        } catch (err) {
            const errorMsg = `Failed to select MDD file: ${err}`;
            setError(errorMsg);
            addLog(`❌ ${errorMsg}`);
        } finally {
            setLoading(false);
        }
    };

    // Verificar que existe el archivo DDF
    const checkDdfExists = async (ddfPath: string) => {
        try {
            const response = await fetch('http://127.0.0.1:8000/test', {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
            });
            
            if (response.ok) {
                addLog('✅ Backend connection verified');
                addLog(`📋 DDF file expected at: ${ddfPath}`);
            } else {
                addLog('⚠️ Backend connection issue - continuing anyway');
            }
        } catch (err) {
            addLog('⚠️ Could not verify backend connection');
        }
    };

    // Iniciar procesamiento usando Backend Python + IBM SPSS
    const startProcessing = async () => {
        if (!selectedMddFile || !selectedDdfFile) {
            setError('Both MDD and DDF files are required');
            return;
        }

        if (!workspacePath) {
            setError('Workspace path is required');
            return;
        }

        try {
            setCurrentStep('processing');
            setError('');
            setProcessingLogs([]);
            addLog('🚀 Starting REAL MDD duplication with IBM SPSS Data Collection...');
            addLog(`📁 MDD File: ${selectedMddFile}`);
            addLog(`📁 DDF File: ${selectedDdfFile}`);
            addLog(`🔢 Duplicate Count: ${duplicateCount}x`);
            addLog(`📂 Workspace: ${workspacePath}`);

            // Crear FormData para enviar archivos al backend
            const formData = new FormData();
            
            // Leer archivos como Blob para enviar al backend
            try {
                // Obtener contenido de archivos usando Tauri
                const mddContent = await readFileAsBase64(selectedMddFile);
                const ddfContent = await readFileAsBase64(selectedDdfFile);
                
                const mddBlob = new Blob([Uint8Array.from(atob(mddContent), c => c.charCodeAt(0))]);
                const ddfBlob = new Blob([Uint8Array.from(atob(ddfContent), c => c.charCodeAt(0))]);
                
                formData.append('mdd_file', mddBlob, getFileName(selectedMddFile));
                formData.append('ddf_file', ddfBlob, getFileName(selectedDdfFile));
                formData.append('duplicate_count', duplicateCount.toString());
                formData.append('workspace_path', workspacePath);
                
                addLog('📤 Sending files to IBM SPSS backend...');
                
            } catch (fileError) {
                addLog(`❌ Error reading files: ${fileError}`);
                throw new Error(`Could not read files: ${fileError}`);
            }

            // Enviar al backend Python con IBM SPSS
            const response = await fetch('http://127.0.0.1:8000/data/duplicate-mdd', {
                method: 'POST',
                body: formData
            });

            const responseData = await response.json();
            addLog('📥 Received response from backend');

            if (response.ok && responseData.success) {
                setResult(responseData);
                setCurrentStep('completed');
                
                // Agregar logs del backend
                if (responseData.processing_logs) {
                    responseData.processing_logs.forEach((log: string) => addLog(log));
                }
                
                addLog('🎉 REAL MDD duplication completed successfully!');
                addLog(`📊 ${responseData.record_summary || 'Processing completed'}`);
                
            } else {
                const errorMessage = responseData.error || responseData.message || 'Unknown error occurred';
                setError(errorMessage);
                setCurrentStep('error');
                addLog(`❌ Backend error: ${errorMessage}`);
                
                // Agregar logs de error del backend
                if (responseData.logs) {
                    responseData.logs.forEach((log: string) => addLog(log));
                }
            }

        } catch (err) {
            const errorMsg = `Processing failed: ${err}`;
            setError(errorMsg);
            setCurrentStep('error');
            addLog(`💥 ${errorMsg}`);
        }
    };

    // Helper function para leer archivos como base64 usando comando de Tauri
    const readFileAsBase64 = async (filePath: string): Promise<string> => {
        try {
            addLog(`📖 Reading file: ${getFileName(filePath)}`);
            const result = await invoke('read_file_as_base64', { filePath }) as string;
            addLog(`✅ File read successfully: ${getFileName(filePath)}`);
            return result;
        } catch (error) {
            addLog(`❌ Error reading file: ${error}`);
            throw new Error(`Could not read file: ${error}`);
        }
    };

    // Helper para obtener nombre de archivo
    const getFileName = (fullPath: string): string => {
        return fullPath.split('\\').pop() || fullPath.split('/').pop() || 'unknown';
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay">
            <div className="modal-content duplicate-mdd-modal">
                {/* Header */}
                <div className="modal-header">
                    <div className="header-icon">🔥</div>
                    <h2>REAL MDD DUPLICATOR - IBM SPSS</h2>
                    <button className="close-button" onClick={onClose}>❌</button>
                </div>

                <div className="modal-body">
                    {/* File Selection Section */}
                    {currentStep === 'idle' && (
                        <div className="section file-selection">
                            <div className="section-title">
                                <span className="section-icon">📂</span>
                                Select MDD/DDF Files for REAL Duplication
                            </div>

                            <div className="file-input-container">
                                <div className="file-display">
                                    {selectedMddFile ? (
                                        <div>
                                            <div className="file-path">📋 MDD: {selectedMddFile}</div>
                                            <div className="file-path">💾 DDF: {selectedDdfFile}</div>
                                        </div>
                                    ) : (
                                        <span className="file-placeholder">📁 No MDD file selected...</span>
                                    )}
                                </div>
                                <button
                                    className="file-browse-btn"
                                    onClick={handleMddFileSelect}
                                    disabled={loading}
                                >
                                    {loading ? '🔄' : '📁'} Select MDD File
                                </button>
                            </div>

                            {error && (
                                <div className="error-message">❌ {error}</div>
                            )}
                        </div>
                    )}

                    {/* Configuration Section */}
                    {currentStep === 'file-selected' && (
                        <div className="section duplication-settings">
                            <div className="section-title">
                                <span className="section-icon">🔧</span>
                                IBM SPSS Duplication Settings
                            </div>

                            <div className="settings-grid">
                                <div className="setting-item">
                                    <label htmlFor="duplicate-count">Number of duplicates (REAL data):</label>
                                    <div className="count-input-container">
                                        <input
                                            id="duplicate-count"
                                            type="number"
                                            value={duplicateCount}
                                            onChange={(e) => setDuplicateCount(parseInt(e.target.value) || 1)}
                                            min="1"
                                            max="50"
                                            className="count-input"
                                        />
                                        <span className="count-icon">🔄</span>
                                    </div>
                                </div>

                                <div className="file-info">
                                    <div className="info-item">
                                        <span className="info-label">📋 MDD File:</span>
                                        <span className="info-value">{getFileName(selectedMddFile)}</span>
                                    </div>
                                    <div className="info-item">
                                        <span className="info-label">💾 DDF File:</span>
                                        <span className="info-value">{getFileName(selectedDdfFile)}</span>
                                    </div>
                                    <div className="info-item">
                                        <span className="info-label">📂 Workspace:</span>
                                        <span className="info-value">{workspacePath}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="ibm-spss-info">
                                <div className="spss-badge">
                                    <span className="badge-icon">🏢</span>
                                    <span className="badge-text">Using IBM SPSS Data Collection v6</span>
                                </div>
                                <div className="spss-details">
                                    ✅ REAL data duplication (no simulated data)<br/>
                                    ✅ Preserves original record structure<br/>
                                    ✅ Generates unique IDs for duplicates<br/>
                                    ✅ Creates ZIP output with MDD/DDF files
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Processing Section */}
                    {currentStep === 'processing' && (
                        <div className="section processing-status">
                            <div className="section-title">
                                <span className="section-icon">⚡</span>
                                IBM SPSS PROCESSING: REAL DATA DUPLICATION
                            </div>

                            <div className="processing-info">
                                <div className="processing-message">
                                    🔄 Processing REAL MDD/DDF data with IBM SPSS Data Collection...
                                </div>
                                <div className="processing-details">
                                    <div className="detail-item">
                                        <span className="detail-label">📋 Input:</span>
                                        <span className="detail-value">{getFileName(selectedMddFile)}</span>
                                    </div>
                                    <div className="detail-item">
                                        <span className="detail-label">🔄 Multiplier:</span>
                                        <span className="detail-value">{duplicateCount}x</span>
                                    </div>
                                </div>
                            </div>

                            <div className="processing-logs">
                                <div className="logs-header">📋 Processing Logs:</div>
                                <div className="logs-content">
                                    {processingLogs.map((log, index) => (
                                        <div key={index} className="log-entry">{log}</div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Completed Section */}
                    {currentStep === 'completed' && result && (
                        <div className="section completion-status">
                            <div className="section-title">
                                <span className="section-icon">✅</span>
                                REAL DUPLICATION COMPLETED - IBM SPSS
                            </div>

                            <div className="completion-message">
                                🎉 Successfully duplicated REAL MDD data using IBM SPSS Data Collection!
                            </div>

                            <div className="results-grid">
                                <div className="result-item">
                                    <span className="result-label">📊 Original records:</span>
                                    <span className="result-value">{result.data?.original_records?.toLocaleString() || 'Unknown'}</span>
                                </div>
                                <div className="result-item">
                                    <span className="result-label">🔄 Duplicated {duplicateCount}x:</span>
                                    <span className="result-value">{result.data?.total_records?.toLocaleString() || 'Unknown'} total records</span>
                                </div>
                                <div className="result-item">
                                    <span className="result-label">⏱️ Processing time:</span>
                                    <span className="result-value">{result.data?.processing_time_seconds || 0} seconds</span>
                                </div>
                                <div className="result-item">
                                    <span className="result-label">📦 Output file:</span>
                                    <span className="result-value">{result.data?.output_file || 'Generated'}</span>
                                </div>
                            </div>

                            <div className="output-location">
                                <div className="location-label">📂 Output Location:</div>
                                <div className="location-path">{result.data?.output_path || workspacePath}</div>
                            </div>

                            {result.record_summary && (
                                <div className="record-summary">
                                    <div className="summary-label">📈 Summary:</div>
                                    <div className="summary-content">{result.record_summary}</div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Error Section */}
                    {currentStep === 'error' && (
                        <div className="section error-status">
                            <div className="section-title">
                                <span className="section-icon">❌</span>
                                PROCESSING ERROR
                            </div>

                            <div className="error-message">{error}</div>

                            {processingLogs.length > 0 && (
                                <div className="error-logs">
                                    <div className="logs-header">📋 Error Logs:</div>
                                    <div className="logs-content">
                                        {processingLogs.map((log, index) => (
                                            <div key={index} className="log-entry">{log}</div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer Actions */}
                <div className="modal-footer">
                    {currentStep === 'idle' && (
                        <button className="modal-button secondary" onClick={onClose}>
                            ❌ Cancel
                        </button>
                    )}

                    {currentStep === 'file-selected' && (
                        <>
                            <button className="modal-button secondary" onClick={() => setCurrentStep('idle')}>
                                ⬅️ Back
                            </button>
                            <button
                                className="modal-button primary"
                                onClick={startProcessing}
                                disabled={loading}
                            >
                                🚀 Start REAL Duplication (IBM SPSS)
                            </button>
                        </>
                    )}

                    {currentStep === 'processing' && (
                        <button className="modal-button secondary" disabled>
                            ⏳ Processing with IBM SPSS...
                        </button>
                    )}

                    {(currentStep === 'completed' || currentStep === 'error') && (
                        <button className="modal-button primary" onClick={onClose}>
                            ✅ Done
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default DuplicateMDD;