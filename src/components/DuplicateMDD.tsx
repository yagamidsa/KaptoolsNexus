// src/components/DuplicateMDD.tsx - SOLO BACKEND PYTHON + IBM SPSS CON PROGRESS CIRCULAR Y SVG NEON

import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import './DuplicateMDD.css';

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

// 🔥 COMPONENTES SVG NEON
const NeonSVGs = {
    Fire: ({ className = "neon-svg large neon-fire pulse" }) => (
        <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2C12 2 8 5 8 11C8 14.31 10.69 17 14 17C17.31 17 20 14.31 20 11C20 9 19 8 18 7C18 9 16 10 14 10C14 8 13 6 12 2Z"
                stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            <path d="M12 17V19M8 19H16M9 22H15"
                stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    ),

    Folder: ({ className = "neon-svg neon-folder" }) => (
        <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M3 7V17C3 18.1046 3.89543 19 5 19H19C20.1046 19 21 18.1046 21 17V9C21 7.89543 20.1046 7 19 7H12L10 5H5C3.89543 5 3 5.89543 3 7Z"
                stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </svg>
    ),

    Settings: ({ className = "neon-svg neon-settings" }) => (
        <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" fill="none" />
            <path d="M19.4 15C19.2669 15.3016 19.2272 15.6362 19.286 15.9606C19.3448 16.285 19.4995 16.5843 19.73 16.82L19.79 16.88C19.976 17.0657 20.1235 17.2863 20.2241 17.5291C20.3248 17.7719 20.3766 18.0322 20.3766 18.295C20.3766 18.5578 20.3248 18.8181 20.2241 19.0609C20.1235 19.3037 19.976 19.5243 19.79 19.71C19.6043 19.896 19.3837 20.0435 19.1409 20.1441C18.8981 20.2448 18.6378 20.2966 18.375 20.2966C18.1122 20.2966 17.8519 20.2448 17.6091 20.1441C17.3663 20.0435 17.1457 19.896 16.96 19.71L16.9 19.65C16.6643 19.4195 16.365 19.2648 16.0406 19.206C15.7162 19.1472 15.3816 19.1869 15.08 19.32C14.7842 19.4468 14.532 19.6572 14.3543 19.9255C14.1766 20.1938 14.0813 20.5082 14.08 20.83V21C14.08 21.5304 13.8693 22.0391 13.4942 22.4142C13.1191 22.7893 12.6104 23 12.08 23C11.5496 23 11.0409 22.7893 10.6658 22.4142C10.2907 22.0391 10.08 21.5304 10.08 21V20.91C10.0723 20.579 9.96512 20.2579 9.77251 19.9887C9.5799 19.7194 9.31074 19.5143 9 19.4C8.69838 19.2669 8.36381 19.2272 8.03941 19.286C7.71502 19.3448 7.41568 19.4995 7.18 19.73L7.12 19.79C6.93425 19.976 6.71368 20.1235 6.47088 20.2241C6.22808 20.3248 5.96783 20.3766 5.705 20.3766C5.44217 20.3766 5.18192 20.3248 4.93912 20.2241C4.69632 20.1235 4.47575 19.976 4.29 19.79C4.10405 19.6043 3.95653 19.3837 3.85588 19.1409C3.75523 18.8981 3.70343 18.6378 3.70343 18.375C3.70343 18.1122 3.75523 17.8519 3.85588 17.6091C3.95653 17.3663 4.10405 17.1457 4.29 16.96L4.35 16.9C4.58054 16.6643 4.73519 16.365 4.794 16.0406C4.85282 15.7162 4.81312 15.3816 4.68 15.08C4.55324 14.7842 4.34276 14.532 4.07447 14.3543C3.80618 14.1766 3.49179 14.0813 3.17 14.08H3C2.46957 14.08 1.96086 13.8693 1.58579 13.4942C1.21071 13.1191 1 12.6104 1 12.08C1 11.5496 1.21071 11.0409 1.58579 10.6658C1.96086 10.2907 2.46957 10.08 3 10.08H3.09C3.42099 10.0723 3.742 9.96512 4.01127 9.77251C4.28053 9.5799 4.48572 9.31074 4.6 9C4.73312 8.69838 4.77282 8.36381 4.714 8.03941C4.65519 7.71502 4.50054 7.41568 4.27 7.18L4.21 7.12C4.02405 6.93425 3.87653 6.71368 3.77588 6.47088C3.67523 6.22808 3.62343 5.96783 3.62343 5.705C3.62343 5.44217 3.67523 5.18192 3.77588 4.93912C3.87653 4.69632 4.02405 4.47575 4.21 4.29C4.39575 4.10405 4.61632 3.95653 4.85912 3.85588C5.10192 3.75523 5.36217 3.70343 5.625 3.70343C5.88783 3.70343 6.14808 3.75523 6.39088 3.85588C6.63368 3.95653 6.85425 4.10405 7.04 4.29L7.1 4.35C7.33568 4.58054 7.63502 4.73519 7.95941 4.794C8.28381 4.85282 8.61838 4.81312 8.92 4.68H9C9.29577 4.55324 9.54802 4.34276 9.72569 4.07447C9.90337 3.80618 9.99872 3.49179 10 3.17V3C10 2.46957 10.2107 1.96086 10.5858 1.58579C10.9609 1.21071 11.4696 1 12 1C12.5304 1 13.0391 1.21071 13.4142 1.58579C13.7893 1.96086 14 2.46957 14 3V3.09C14.0013 3.41179 14.0966 3.72618 14.2743 3.99447C14.452 4.26276 14.7042 4.47324 15 4.6C15.3016 4.73312 15.6362 4.77282 15.9606 4.714C16.285 4.65519 16.5843 4.50054 16.82 4.27L16.88 4.21C17.0657 4.02405 17.2863 3.87653 17.5291 3.77588C17.7719 3.67523 18.0322 3.62343 18.295 3.62343C18.5578 3.62343 18.8181 3.67523 19.0609 3.77588C19.3037 3.87653 19.5243 4.02405 19.71 4.21C19.896 4.39575 20.0435 4.61632 20.1441 4.85912C20.2448 5.10192 20.2966 5.36217 20.2966 5.625C20.2966 5.88783 20.2448 6.14808 20.1441 6.39088C20.0435 6.63368 19.896 6.85425 19.71 7.04L19.65 7.1C19.4195 7.33568 19.2648 7.63502 19.206 7.95941C19.1472 8.28381 19.1869 8.61838 19.32 8.92V9C19.4468 9.29577 19.6572 9.54802 19.9255 9.72569C20.1938 9.90337 20.5082 9.99872 20.83 10H21C21.5304 10 22.0391 10.2107 22.4142 10.5858C22.7893 10.9609 23 11.4696 23 12C23 12.5304 22.7893 13.0391 22.4142 13.4142C22.0391 13.7893 21.5304 14 21 14H20.91C20.5882 14.0013 20.2738 14.0966 20.0055 14.2743C19.7372 14.452 19.5268 14.7042 19.4 15Z"
                stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </svg>
    ),

    Lightning: ({ className = "neon-svg neon-lightning" }) => (
        <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M13 2L3 14H12L11 22L21 10H12L13 2Z"
                stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </svg>
    ),

    Check: ({ className = "neon-svg neon-check" }) => (
        <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M20 6L9 17L4 12"
                stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </svg>
    ),

    Error: ({ className = "neon-svg neon-error" }) => (
        <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none" />
            <line x1="15" y1="9" x2="9" y2="15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <line x1="9" y1="9" x2="15" y2="15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
    ),

    Close: ({ className = "neon-svg neon-close" }) => (
        <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
    ),

    Back: ({ className = "neon-svg neon-back" }) => (
        <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M19 12H5M12 19L5 12L12 5"
                stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </svg>
    ),

    Duplicate: ({ className = "neon-svg neon-duplicate rotate" }) => (
        <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M16 4H18C19.1046 4 20 4.89543 20 6V18C20 19.1046 19.1046 20 18 20H6C4.89543 20 4 19.1046 4 18V16"
                stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            <rect x="4" y="4" width="12" height="12" rx="2" ry="2"
                stroke="currentColor" strokeWidth="2" fill="none" />
        </svg>
    ),

    Logs: ({ className = "neon-svg neon-logs" }) => (
        <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M14 2H6C4.89543 2 4 2.89543 4 4V20C4 21.1046 4.89543 22 6 22H18C19.1046 22 20 21.1046 20 20V8L14 2Z"
                stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            <polyline points="14,2 14,8 20,8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            <line x1="16" y1="13" x2="8" y2="13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <line x1="16" y1="17" x2="8" y2="17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <polyline points="10,9 9,9 8,9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </svg>
    ),

    Stats: ({ className = "neon-svg neon-stats" }) => (
        <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <line x1="18" y1="20" x2="18" y2="10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <line x1="12" y1="20" x2="12" y2="4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <line x1="6" y1="20" x2="6" y2="14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
    ),

    Location: ({ className = "neon-svg neon-location" }) => (
        <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M21 10C21 17 12 23 12 23C12 23 3 17 3 10C3 5.02944 7.02944 1 12 1C16.9706 1 21 5.02944 21 10Z"
                stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            <circle cx="12" cy="10" r="3" stroke="currentColor" strokeWidth="2" fill="none" />
        </svg>
    ),

    Summary: ({ className = "neon-svg neon-summary" }) => (
        <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <polyline points="22,12 18,12 15,21 9,3 6,12 2,12"
                stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </svg>
    ),

    Processing: ({ className = "neon-svg neon-duplicate pulse" }) => (
        <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="1" stroke="currentColor" strokeWidth="2" fill="currentColor">
                <animateTransform attributeName="transform" attributeType="XML" type="rotate" dur="1s"
                    from="0 12 12" to="360 12 12" repeatCount="indefinite" />
            </circle>
            <circle cx="12" cy="12" r="2" stroke="currentColor" strokeWidth="1" fill="none" opacity="0.8">
                <animateTransform attributeName="transform" attributeType="XML" type="rotate" dur="2s"
                    from="0 12 12" to="360 12 12" repeatCount="indefinite" />
            </circle>
            <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1" fill="none" opacity="0.6">
                <animateTransform attributeName="transform" attributeType="XML" type="rotate" dur="3s"
                    from="0 12 12" to="360 12 12" repeatCount="indefinite" />
            </circle>
        </svg>
    )
};



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
    const [showProgress, setShowProgress] = useState(false);

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
        setShowProgress(false);
    };

    // Función para agregar logs
    const addLog = (message: string) => {
        const timestamp = new Date().toLocaleTimeString();
        const logEntry = `[${timestamp}] ${message}`;
        setProcessingLogs(prev => [...prev, logEntry]);
    };

    const extractTimeFromLogs = (logs: string[]) => {
        const timeLog = logs.find(log => log.includes('Proceso completado en'));
        if (timeLog) {
            const match = timeLog.match(/(\d+\.?\d*)\s*segundos/);
            if (match) {
                const totalSeconds = parseFloat(match[1]);
                const minutes = Math.floor(totalSeconds / 60);
                const seconds = Math.floor(totalSeconds % 60);

                if (minutes > 0) {
                    return `${minutes}m ${seconds}s`;
                } else {
                    return `${seconds}s`;
                }
            }
        }
        return '0s';
    };

    // Componente Progress Circular
    const CircularProgress = () => (
        <div className={`circular-progress ${!showProgress ? 'hide' : ''}`}>
            <svg className="progress-ring" viewBox="0 0 120 120">
                <circle className="progress-ring-bg" />
                <circle className="progress-ring-fill" />
            </svg>
        </div>
    );

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
            setShowProgress(true); // 🔥 Mostrar progress circular
            setError('');
            setProcessingLogs([]);
            addLog('🚀 Starting  MDD duplication with IBM SPSS Data Collection...');
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

                // 🔥 Ocultar progress antes de mostrar completado
                setShowProgress(false);

                // Pequeño delay para la animación de ocultación
                setTimeout(() => {
                    setCurrentStep('completed');
                }, 500);

                // Agregar logs del backend
                if (responseData.processing_logs) {
                    responseData.processing_logs.forEach((log: string) => addLog(log));
                }

                addLog('🎉  MDD duplication completed successfully!');
                addLog(`📊 ${responseData.record_summary || 'Processing completed'}`);

            } else {
                const errorMessage = responseData.error || responseData.message || 'Unknown error occurred';
                setError(errorMessage);
                setShowProgress(false); // 🔥 Ocultar progress en error
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
            setShowProgress(false); // 🔥 Ocultar progress en error
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
                <div className="dup-modal-header">
                    <div className="dup-header-icon">
                        <NeonSVGs.Fire />
                    </div>
                    <h2> MDD DUPLICATOR - IBM SPSS</h2>
                    <button className="dup-close-button" onClick={onClose}>
                        <NeonSVGs.Close />
                    </button>
                </div>

                <div className="modal-body">
                    {/* File Selection Section */}
                    {currentStep === 'idle' && (
                        <div className="section file-selection">
                            <div className="section-title">
                                <span className="section-icon">
                                    <NeonSVGs.Folder />
                                </span>
                                Select MDD/DDF Files for  Duplication
                            </div>

                            <div className="file-input-container">
                                <div className="file-display">
                                    {selectedMddFile ? (
                                        <div>
                                            <div className="dup-file-path">📋 MDD: {selectedMddFile}</div>
                                            <div className="dup-file-path">💾 DDF: {selectedDdfFile}</div>
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
                                    {loading ? <NeonSVGs.Processing /> : <NeonSVGs.Folder />} Select MDD File
                                </button>
                            </div>

                            {error && (
                                <div className="dup-error-message">
                                    <NeonSVGs.Error className="dup-neon-svg dup-small neon-error" /> {error}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Configuration Section */}
                    {currentStep === 'file-selected' && (
                        <div className="section duplication-settings">
                            <div className="section-title">
                                <span className="section-icon">
                                    <NeonSVGs.Settings />
                                </span>
                                IBM SPSS Duplication Settings
                            </div>

                            <div className="settings-grid">
                                <div className="setting-item">
                                    <label htmlFor="duplicate-count">Number of duplicates ( data):</label>
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
                                        <span className="count-icon">
                                            <NeonSVGs.Duplicate />
                                        </span>
                                    </div>
                                </div>

                                <div className="file-info">
                                    <div className="info-item">
                                        <span className="dup-info-label">📋 MDD File:</span>
                                        <span className="info-value">{getFileName(selectedMddFile)}</span>
                                    </div>
                                    <div className="info-item">
                                        <span className="dup-info-label">💾 DDF File:</span>
                                        <span className="info-value">{getFileName(selectedDdfFile)}</span>
                                    </div>
                                    <div className="info-item">
                                        <span className="dup-info-label">📂 Workspace:</span>
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
                                    ✅  data duplication<br />
                                    ✅ Preserves original record structure<br />
                                    ✅ Generates unique IDs for duplicates<br />
                                    ✅ Creates ZIP output with MDD/DDF files
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Processing Section */}
                    {currentStep === 'processing' && (
                        <div className="section processing-status">
                            <div className="section-title">
                                <span className="section-icon">
                                    <NeonSVGs.Lightning />
                                </span>
                                IBM SPSS PROCESSING:  DATA DUPLICATION
                            </div>

                            {/* 🔥 PROGRESS CIRCULAR - CENTRADO */}
                            <CircularProgress />

                            <div className="processing-info">
                                <div className="processing-message">
                                    🔄 Processing  MDD/DDF data with IBM SPSS Data Collection...
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
                                <div className="logs-header">
                                    <NeonSVGs.Logs className="dup-neon-svg dup-small neon-logs" /> Processing Logs:
                                </div>
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
                                <span className="section-icon">
                                    <NeonSVGs.Check />
                                </span>
                                DUPLICATION COMPLETED - IBM SPSS
                            </div>

                            <div className="completion-message">
                                🎉 Successfully duplicated  MDD data using IBM SPSS Data Collection!
                            </div>

                            <div className="dup-results-grid">
                                <div className="result-item">
                                    <span className="result-label">
                                        <NeonSVGs.Stats className="dup-neon-svg dup-small neon-stats" /> Original records:
                                    </span>
                                    <span className="result-value">{result.data?.original_records?.toLocaleString() || 'Unknown'}</span>
                                </div>
                                <div className="result-item">
                                    <span className="result-label">
                                        <NeonSVGs.Duplicate className="dup-neon-svg dup-small neon-duplicate" /> Duplicated {duplicateCount}x:
                                    </span>
                                    <span className="result-value">{result.data?.total_records?.toLocaleString() || 'Unknown'} total records</span>
                                </div>
                                <div className="result-item">
                                    <span className="result-label">⏱️ Processing time:</span>
                                    <span className="result-value">{extractTimeFromLogs(result.processing_logs || [])} seconds</span>
                                </div>
                                <div className="result-item">
                                    <span className="result-label">📦 Output file:</span>
                                    <span className="result-value">{result.data?.output_file || 'Generated'}</span>
                                </div>
                            </div>

                            <div className="output-location">
                                <div className="location-label">
                                    <NeonSVGs.Location className="dup-neon-svg dup-small neon-location" /> Output Location:
                                </div>
                                <div className="location-path">{result.data?.output_path || workspacePath}</div>
                            </div>

                            {result.record_summary && (
                                <div className="record-summary">
                                    <div className="summary-label">
                                        <NeonSVGs.Summary className="dup-neon-svg dup-small neon-summary" /> Summary:
                                    </div>
                                    <div className="summary-content">{result.record_summary}</div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Error Section */}
                    {currentStep === 'error' && (
                        <div className="section error-status">
                            <div className="section-title">
                                <span className="section-icon">
                                    <NeonSVGs.Error />
                                </span>
                                PROCESSING ERROR
                            </div>

                            <div className="dup-error-message">
                                <NeonSVGs.Error className="dup-neon-svg dup-small neon-error" /> {error}
                            </div>

                            {processingLogs.length > 0 && (
                                <div className="error-logs">
                                    <div className="logs-header">
                                        <NeonSVGs.Logs className="dup-neon-svg dup-small neon-logs" /> Error Logs:
                                    </div>
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
                        <button className="dup-modal-button dup-secondary" onClick={onClose}>
                            <NeonSVGs.Close className="dup-neon-svg dup-small neon-close" /> Cancel
                        </button>
                    )}

                    {currentStep === 'file-selected' && (
                        <>
                            <button className="dup-modal-button dup-secondary" onClick={() => setCurrentStep('idle')}>
                                <NeonSVGs.Back className="dup-neon-svg dup-small neon-back" /> Back
                            </button>
                            <button
                                className="dup-modal-button dup-primary"
                                onClick={startProcessing}
                                disabled={loading}
                            >
                                <NeonSVGs.Lightning className="dup-neon-svg dup-small neon-lightning" /> Start  Duplication (IBM SPSS)
                            </button>
                        </>
                    )}

                    {currentStep === 'processing' && (
                        <button className="dup-modal-button dup-secondary" disabled>
                            <NeonSVGs.Processing className="dup-neon-svg dup-small neon-duplicate" /> Processing with IBM SPSS...
                        </button>
                    )}

                    {(currentStep === 'completed' || currentStep === 'error') && (
                        <button className="dup-modal-button dup-primary" onClick={onClose}>
                            <NeonSVGs.Check className="dup-neon-svg dup-small neon-check" /> Done
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default DuplicateMDD;